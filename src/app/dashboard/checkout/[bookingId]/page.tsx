"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useProfile } from "@/context/ProfileContext";
import { useToast } from "@/context/ToastContext";
import { insertNotification } from "@/lib/notifications";
import { isUUID } from "@/lib/utils";
import { Icons as IC } from "@/components/ui/Icons";
import { Avatar } from "@/components/ui";
import { Customer, DbCheckoutServiceItemRow, SalonGstSettings, DEFAULT_GST_SETTINGS, GstTaxBreakdown } from "@/types";
import { calculateGst, calculateItemGst, validateGstin, shouldUseIgst } from "@/lib/gst";
import { useGstSettings } from "@/hooks/useGstSettings";

interface ServiceItem {
  id: number;
  name: string;
  qty: number;
  price: number;
  service_id?: string;
}

interface Booking {
  id: string;
  customer: Customer;
  stylist: string;
  services: ServiceItem[];
  status?: string;
  paymentStatus?: PaymentStatus;
  amountPaid?: number;
  amountDue?: number;
}

type DiscountType = "amount" | "percent";
type PaymentMode = "full" | "partial" | "due";
type PaymentStatus = "due" | "partial" | "paid";

interface PaymentSubmission {
  method: string;
  received: number;
}

interface PaymentInfo extends PaymentSubmission {
  status: PaymentStatus;
  amountDue: number;
  mode: PaymentMode;
}

import { PAYMENT_METHODS } from "@/constants/checkout";

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { salonId } = useProfile();

  const bookingId = (params?.bookingId as string) || "";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbServices, setDbServices] = useState<{ id: string; name: string; price: number; kind?: string | null }[]>([]);

  // Resolve booking — only for UUID-sourced bookings loaded from DB
  const baseBooking = useMemo(() => {
    return booking || null;
  }, [booking]);

  const [stage, setStage] = useState<"bill" | "pay" | "receipt">("bill");
  const [method, setMethod] = useState<string>("upi");
  const [items, setItems] = useState<ServiceItem[]>(baseBooking?.services || []);
  const [discountType, setDiscountType] = useState<DiscountType>("amount");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [tip, setTip] = useState<number>(0);
  const [roundOff, setRoundOff] = useState<boolean>(true);
  const [existingPaidAmount, setExistingPaidAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("full");
  const [partialAmount, setPartialAmount] = useState<number>(0);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const { show: triggerFlash } = useToast();
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);
  const [invoiceShareToken, setInvoiceShareToken] = useState<string | null>(null);

  // B2B GST Customer Details
  const [showB2b, setShowB2b] = useState<boolean>(false);
  const [customerGstin, setCustomerGstin] = useState<string>("");
  const [customerBusinessName, setCustomerBusinessName] = useState<string>("");
  const [customerBillingAddress, setCustomerBillingAddress] = useState<string>("");
  const [customerBillingState, setCustomerBillingState] = useState<string>("");
  const [customerBillingStateCode, setCustomerBillingStateCode] = useState<string>("");

  // GST settings
  const { settings: gstSettings, isGstEnabled } = useGstSettings(salonId);

  // Fetch Booking details if UUID
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const isUuid = isUUID(bookingId);

    if (!isUuid || !supabase) {
      queueMicrotask(() => {
        setBooking(null);
        setItems([]);
        setLoading(false);
      });
      return;
    }

    const loadBooking = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("bookings")
          .select(`
            id,
            notes,
            status,
            payment_status,
            bill_subtotal,
            discount_type,
            discount_value,
            discount_amount,
            tip_amount,
            round_off_amount,
            bill_total,
            amount_paid,
            amount_due,
            paid_at,
            customer:customers (id, name, phone),
            stylist:stylists (id, name, tone),
            booking_services (
              qty,
              price_at_booking,
              service:services (id, name, price)
            ),
            payments (
              amount,
              method,
              received_at
            )
          `)
          .eq("id", bookingId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const cleanTone = (t: string) => t.replace("tone-", "");
          const customerRaw = data.customer;
          const customerObj = Array.isArray(customerRaw) ? customerRaw[0] : customerRaw;

          const stylistRaw = data.stylist;
          const stylistObj = Array.isArray(stylistRaw) ? stylistRaw[0] : stylistRaw;

          const custName = customerObj?.name || "Walk-in Customer";
          const custInitials = custName
            .split(" ")
            .map((p: string) => p[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "WC";


          const serviceItems: ServiceItem[] = (data.booking_services as unknown as DbCheckoutServiceItemRow[] || []).map((bs, idx: number) => ({
            id: idx + 1,
            name: bs.service?.name || "Unknown Service",
            qty: bs.qty || 1,
            price: Number(bs.price_at_booking),
            service_id: bs.service?.id
          }));

          const bData: Booking = {
            id: data.id,
            customer: {
              id: customerObj?.id || "",
              name: custName,
              initials: custInitials,
              tone: stylistObj?.tone ? cleanTone(stylistObj.tone) : "b",
              phone: customerObj?.phone || ""
            },
            stylist: stylistObj?.name || "Unassigned",
            services: serviceItems,
            status: data.status,
            paymentStatus: (data.payment_status || (data.status === "Paid" ? "paid" : "due")) as PaymentStatus,
            amountPaid: Number(data.amount_paid || 0),
            amountDue: Number(data.amount_due || 0),
          };

          setBooking(bData);
          setItems(serviceItems);
          const payments = Array.isArray(data.payments) ? data.payments : [];
          const paidFromLedger = payments.reduce((sum: number, row: { amount?: number | string | null }) => sum + Number(row.amount || 0), 0);
          const loadedPaid = Number(data.amount_paid || paidFromLedger || 0);
          const loadedDiscountAmount = Number(data.discount_amount || 0);
          const loadedDiscountType = data.discount_type === "percent" ? "percent" : "amount";
          const loadedDiscountValue = Number(data.discount_value || loadedDiscountAmount || 0);

          setExistingPaidAmount(loadedPaid);
          setDiscountType(loadedDiscountType);
          setDiscountValue(loadedDiscountValue);
          setTip(Number(data.tip_amount || 0));

          // If booking is already paid, fetch payment details and jump to receipt stage
          if ((data.payment_status === "paid" || data.status === "Paid") && loadedPaid > 0) {
            const lastPayment = payments
              .slice()
              .sort((a: { received_at?: string | null }, b: { received_at?: string | null }) =>
                String(b.received_at || "").localeCompare(String(a.received_at || ""))
              )[0];

            setPayment({
              method: lastPayment?.method || "Completed",
              received: Number(lastPayment?.amount || loadedPaid),
              status: "paid",
              amountDue: 0,
              mode: "full",
            });
            setStage("receipt");
          }
        }
      } catch (err) {
        console.error("Error loading booking for checkout:", err);
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
  }, [bookingId]);

  // Load salon services from Supabase
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !booking?.id) return;
    const isUuid = isUUID(bookingId);
    if (!isUuid) return;

    const loadDbServices = async () => {
      try {
        const { data: bookingData } = await supabase
          .from("bookings")
          .select("salon_id")
          .eq("id", bookingId)
          .maybeSingle();

        if (bookingData?.salon_id) {
          const { data: svcs } = await supabase
            .from("services")
            .select("id, name, price, kind")
            .eq("salon_id", bookingData.salon_id)
            .eq("active", true)
            .is("deleted_at", null);

          if (svcs) {
            setDbServices(svcs.map(s => ({
              id: s.id,
              name: s.name,
              price: Number(s.price),
              kind: s.kind || "service"
            })));
          }
        }
      } catch (err) {
        console.error("Failed to load services for checkout page:", err);
      }
    };

    loadDbServices();
  }, [booking?.id, bookingId]);

  const availableServices = dbServices.length > 0
    ? dbServices
    : [];

  // Sync state if booking ID changes
  useEffect(() => {
    queueMicrotask(() => {
      setItems([]);
      setDiscountType("amount");
      setDiscountValue(0);
      setTip(0);
      setRoundOff(true);
      setExistingPaidAmount(0);
      setPaymentMode("full");
      setPartialAmount(0);
      setPayment(null);
      setStage("bill");
    });
  }, [bookingId]);

  const subtotal = useMemo(() => {
    return items.reduce((s, i) => s + i.qty * i.price, 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    if (discountType === "percent") {
      return Math.min(subtotal, Math.round((subtotal * Math.min(100, discountValue)) / 100));
    }
    return Math.min(subtotal, discountValue);
  }, [discountType, discountValue, subtotal]);

  // IGST state check
  const isIgst = useMemo(() => {
    if (!isGstEnabled || !customerGstin) return false;
    const result = validateGstin(customerGstin);
    if (!result.valid || !result.stateCode) return false;
    return shouldUseIgst(gstSettings.state_code, result.stateCode);
  }, [isGstEnabled, customerGstin, gstSettings.state_code]);

  // GST tax breakdown
  const gstBreakdown = useMemo(() => {
    if (!isGstEnabled) return null;
    const afterDiscount = Math.max(0, subtotal - discountAmount);
    return calculateGst(afterDiscount, gstSettings.gst_rate, gstSettings.pricing_mode, isIgst);
  }, [isGstEnabled, subtotal, discountAmount, gstSettings.gst_rate, gstSettings.pricing_mode, isIgst]);

  const beforeRound = useMemo(() => {
    const base = Math.max(0, subtotal - discountAmount);
    const tax = (isGstEnabled && gstSettings.pricing_mode === "tax_exclusive" && gstBreakdown)
      ? gstBreakdown.totalTax
      : 0;
    return Math.max(0, base + tax + tip);
  }, [subtotal, discountAmount, tip, isGstEnabled, gstSettings.pricing_mode, gstBreakdown]);

  const roundedTotal = useMemo(() => {
    return roundOff ? Math.round(beforeRound / 10) * 10 : beforeRound;
  }, [beforeRound, roundOff]);

  const roundOffAmt = useMemo(() => {
    return roundedTotal - beforeRound;
  }, [roundedTotal, beforeRound]);

  const total = roundedTotal;

  const balanceDue = useMemo(() => {
    return Math.max(0, total - existingPaidAmount);
  }, [existingPaidAmount, total]);

  const collectAmount = paymentMode === "partial"
    ? Math.min(balanceDue, Math.max(0, partialAmount))
    : paymentMode === "due"
      ? 0
      : balanceDue;

  const amountDueAfterCollection = Math.max(0, balanceDue - collectAmount);

  // Qty helpers
  const updateQty = (id: number, delta: number) => {
    setItems(
      items.map((i) =>
        i.id === id ? { ...i, qty: Math.max(1, Math.min(9, i.qty + delta)) } : i
      )
    );
  };

  const removeItem = (id: number) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const handleAddService = (name: string, price: number, serviceId?: string) => {
    // Check if item already exists
    const existing = items.find((i) => i.name === name);
    if (existing) {
      updateQty(existing.id, 1);
      triggerFlash(`Added another ${name}`);
    } else {
      const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
      setItems([...items, { id: nextId, name, qty: 1, price, service_id: serviceId }]);
      triggerFlash(`Added ${name} to bill`);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      if (paymentMode === "partial") {
        setPartialAmount(balanceDue > 0 ? Math.ceil(balanceDue / 2) : 0);
      }
    });
  }, [balanceDue, paymentMode]);



  const finishPayment = async (p: PaymentSubmission) => {
    if (!baseBooking) return;
    if (submitting) return;
    const amountToRecord = Math.max(0, Math.min(balanceDue, p.received));
    const amountPaidAfter = existingPaidAmount + amountToRecord;
    const amountDueAfter = Math.max(0, total - amountPaidAfter);
    const nextPaymentStatus: PaymentStatus = amountDueAfter <= 0 && total > 0
      ? "paid"
      : amountPaidAfter > 0
        ? "partial"
        : "due";

    setSubmitting(true);
    try {
      const isUuid = isUUID(bookingId);
      if (isUuid) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          try {
            let paymentMethod: 'UPI' | 'Cash' | 'Card' = 'UPI';
            if (p.method.toLowerCase().includes('cash')) paymentMethod = 'Cash';
            else if (p.method.toLowerCase().includes('card')) paymentMethod = 'Card';

            const insertPayload: {
              booking_id: string;
              method: string;
              amount: number;
              tip?: number;
              discount?: number;
            } = {
              booking_id: bookingId,
              method: paymentMethod,
              amount: amountToRecord,
            };

            if (existingPaidAmount <= 0 && tip > 0) insertPayload.tip = tip;
            if (existingPaidAmount <= 0 && discountAmount > 0) insertPayload.discount = discountAmount;

            if (amountToRecord > 0) {
              const { error: paymentError } = await supabase
                .from("payments")
                .insert(insertPayload);

              if (paymentError) {
                console.error("Payment insert error:", paymentError);
                // Don't throw — still complete the flow
              }
            }

            const canSyncServices = items.every(it => {
              const sId = it.service_id || dbServices.find(ds => ds.name === it.name)?.id;
              return sId && isUUID(String(sId));
            });

            if (canSyncServices) {
              await supabase
                .from("booking_services")
                .delete()
                .eq("booking_id", bookingId);

              const insertRows = items.map(it => {
                const sId = it.service_id || dbServices.find(ds => ds.name === it.name)?.id;
                return {
                  booking_id: bookingId,
                  service_id: sId,
                  qty: it.qty,
                  price_at_booking: it.price
                };
              });

              await supabase
                .from("booking_services")
                .insert(insertRows);
            }

            const { error: statusError } = await supabase
              .from("bookings")
              .update({
                status: "Completed",
                payment_status: nextPaymentStatus,
                bill_subtotal: subtotal,
                discount_type: discountType,
                discount_value: discountValue,
                discount_amount: discountAmount,
                tip_amount: tip,
                round_off_amount: roundOffAmt,
                bill_total: total,
                amount_paid: amountPaidAfter,
                amount_due: amountDueAfter,
                paid_at: nextPaymentStatus === "paid" ? new Date().toISOString() : null,
              })
              .eq("id", bookingId);

            if (statusError) throw statusError;

            if (salonId) {
              const notificationTitle = nextPaymentStatus === "paid"
                ? "Payment received"
                : nextPaymentStatus === "partial"
                  ? "Partial payment received"
                  : "Payment marked due";
              const notificationBody = amountToRecord > 0
                ? `₹${amountToRecord.toLocaleString("en-IN")} received from ${baseBooking.customer.name} via ${p.method}. ₹${amountDueAfter.toLocaleString("en-IN")} due.`
                : `₹${amountDueAfter.toLocaleString("en-IN")} marked due for ${baseBooking.customer.name}.`;

              insertNotification({
                salon_id: salonId,
                type: "payment",
                title: notificationTitle,
                body: notificationBody,
                meta: { booking_id: bookingId, amount: amountToRecord, due: amountDueAfter, method: p.method },
              });
            }

            // Generate GST invoice if enabled and payment completed
            if (isGstEnabled && salonId && baseBooking && gstBreakdown && (nextPaymentStatus === "paid")) {
              try {
                const { data: invNumData } = await supabase.rpc("next_gst_invoice_number", {
                  p_salon_id: salonId,
                  p_prefix: gstSettings.invoice_prefix || "SAL",
                });
                const invoiceNumber = invNumData || "SAL-0000-000001";
                const now = new Date();
                const yr = now.getFullYear();
                const mo = now.getMonth() + 1;
                const fy = mo < 4 ? `${(yr-1).toString().slice(2)}${yr.toString().slice(2)}` : `${yr.toString().slice(2)}${(yr+1).toString().slice(2)}`;

                const { data: invData, error: invError } = await supabase
                  .from("gst_invoices")
                  .insert({
                    salon_id: salonId,
                    booking_id: bookingId,
                    invoice_number: invoiceNumber,
                    financial_year: fy,
                    salon_legal_name: gstSettings.legal_name || baseBooking.customer.name,
                    salon_gstin: gstSettings.gstin,
                    salon_address: gstSettings.registered_address || null,
                    salon_state: gstSettings.state || null,
                    salon_state_code: gstSettings.state_code || null,
                    customer_name: baseBooking.customer.name,
                    customer_phone: baseBooking.customer.phone || null,
                    // B2B fields
                    customer_gstin: customerGstin ? customerGstin.trim().toUpperCase() : null,
                    customer_business_name: customerBusinessName ? customerBusinessName.trim() : null,
                    customer_billing_address: customerBillingAddress ? customerBillingAddress.trim() : null,
                    customer_billing_state: customerBillingState || null,
                    customer_billing_state_code: customerBillingStateCode || null,
                    is_igst: isIgst,
                    sac_code: gstSettings.sac_code || "999721",
                    taxable_amount: gstBreakdown.taxableAmount,
                    cgst_rate: gstBreakdown.cgstRate,
                    cgst_amount: gstBreakdown.cgstAmount,
                    sgst_rate: gstBreakdown.sgstRate,
                    sgst_amount: gstBreakdown.sgstAmount,
                    igst_rate: gstBreakdown.igstRate,
                    igst_amount: gstBreakdown.igstAmount,
                    discount_amount: discountAmount,
                    total_amount: total,
                    payment_method: p.method,
                  })
                  .select("id, share_token")
                  .single();

                if (invError) {
                  console.error("GST invoice creation error:", invError);
                } else if (invData) {
                  setInvoiceShareToken(invData.share_token);
                  const lineItems = items.map(it => {
                    const itemTax = calculateItemGst(it.name, gstSettings.sac_code || "999721", it.price, it.qty, gstSettings.gst_rate, gstSettings.pricing_mode, isIgst);
                    return {
                      invoice_id: invData.id,
                      service_name: it.name,
                      sac_code: gstSettings.sac_code || "999721",
                      qty: it.qty,
                      unit_price: it.price,
                      taxable_amount: itemTax.taxableAmount,
                      cgst_amount: itemTax.cgstAmount,
                      sgst_amount: itemTax.sgstAmount,
                      igst_amount: itemTax.igstAmount,
                      total_amount: itemTax.totalAmount
                    };
                  });
                  await supabase.from("gst_invoice_items").insert(lineItems);
                }
              } catch (invErr) {
                console.error("GST invoice generation error (non-fatal):", invErr);
              }
            }

          } catch (err) {
            console.error("Failed to save payment to Supabase:", err);
            alert("Failed to record payment in database, but marking as paid in UI.");
          }
        }
      }

      setExistingPaidAmount(amountPaidAfter);
      setPayment({
        ...p,
        received: amountToRecord,
        status: nextPaymentStatus,
        amountDue: amountDueAfter,
        mode: paymentMode,
      });
      setBooking(prev => prev ? {
        ...prev,
        status: "Completed",
        paymentStatus: nextPaymentStatus,
        amountPaid: amountPaidAfter,
        amountDue: amountDueAfter,
      } : prev);
      setStage("receipt");
    } finally {
      setSubmitting(false);
    }
  };

  // Cash payment details
  const [cashReceived, setCashReceived] = useState<number>(0);
  const changeToReturn = useMemo(() => {
    return Math.max(0, cashReceived - collectAmount);
  }, [cashReceived, collectAmount]);

  // Set default cash received value when total updates
  useEffect(() => {
    queueMicrotask(() => {
      setCashReceived(collectAmount);
    });
  }, [collectAmount]);

  // Quick cash options
  const quickAmounts = useMemo(() => {
    const arr = [
      collectAmount,
      Math.ceil(collectAmount / 100) * 100,
      Math.ceil(collectAmount / 500) * 500,
      Math.ceil(collectAmount / 500) * 500 + 500,
    ];
    return Array.from(new Set(arr)).slice(0, 4);
  }, [collectAmount]);

  // Card status simulated toggle
  const [cardWaiting, setCardWaiting] = useState<boolean>(true);
  useEffect(() => {
    if (stage === "pay" && method === "card") {
      queueMicrotask(() => {
        setCardWaiting(true);
      });
      const timer = setTimeout(() => {
        setCardWaiting(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [stage, method]);

  if (loading) {
    return (
      <div className="ck-stage">
        <div className="ck-frame">
          <header className="ck-top">
            <div className="book-back" style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-2)" }} />
            <div className="ck-top-title" style={{ flex: 1, marginLeft: 12 }}>
              <div className="pulse" style={{ width: 120, height: 16, borderRadius: 4 }} />
              <div className="pulse" style={{ width: 180, height: 10, borderRadius: 3, marginTop: 6 }} />
            </div>
            <div className="ck-customer">
              <div className="pulse" style={{ width: 32, height: 32, borderRadius: "50%" }} />
            </div>
          </header>

          <main className="ck-body" style={{ paddingBottom: 90 }}>
            {/* Customer Section Label Skeleton */}
            <div className="ck-section-lbl pulse" style={{ width: 80, height: 10, borderRadius: 3, marginBottom: 8 }} />
            
            {/* Customer card skeleton */}
            <div className="ck-cust-card" style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
              <div className="pulse" style={{ width: 38, height: 38, borderRadius: "50%" }} />
              <div style={{ flex: 1 }}>
                <div className="pulse" style={{ width: 120, height: 14, borderRadius: 4 }} />
                <div className="pulse" style={{ width: 100, height: 10, borderRadius: 3, marginTop: 6 }} />
              </div>
            </div>

            {/* Services Label Skeleton */}
            <div className="ck-section-lbl pulse" style={{ width: 80, height: 10, borderRadius: 3, marginBottom: 8 }} />

            {/* Services List skeleton */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {[1, 2].map(i => (
                <div key={i} className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div className="pulse" style={{ width: 150, height: 14, borderRadius: 4 }} />
                    <div className="pulse" style={{ width: 80, height: 10, borderRadius: 3, marginTop: 6 }} />
                  </div>
                  <div className="pulse" style={{ width: 60, height: 14, borderRadius: 4 }} />
                </div>
              ))}
            </div>

            {/* Bill Details label skeleton */}
            <div className="ck-section-lbl pulse" style={{ width: 100, height: 10, borderRadius: 3, marginBottom: 8 }} />

            {/* Bill summary skeleton */}
            <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                  <div className="pulse" style={{ width: 80, height: 12, borderRadius: 3 }} />
                  <div className="pulse" style={{ width: 50, height: 12, borderRadius: 3 }} />
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: 4 }}>
                <div className="pulse" style={{ width: 60, height: 16, borderRadius: 4 }} />
                <div className="pulse" style={{ width: 75, height: 18, borderRadius: 4 }} />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!baseBooking) {
    return (
      <div className="ck-stage">
        <div className="ck-frame" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔍</div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Booking not found</h2>
          <p style={{ color: "var(--ink-3)", fontSize: 13 }}>This booking may have been removed or the link is invalid.</p>
          <Link href="/dashboard" className="btn btn-primary" style={{ textDecoration: "none" }}>Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-2 flex items-start justify-center p-8 pb-20 max-md:p-0">
      <div className="w-full max-w-[560px] bg-bg rounded-3xl border border-line overflow-hidden shadow-[0_30px_60px_-30px_rgba(14,21,18,0.18)] flex flex-col relative max-md:rounded-none max-md:border-0 max-md:min-h-screen">
        <header className="flex items-center gap-3 p-4 bg-white border-b border-line">
          <button
            className="w-8 h-8 rounded-lg grid place-items-center hover:bg-bg-2 cursor-pointer transition-colors duration-150"
            onClick={() => {
              if (booking?.status === "Paid") {
                router.back();
              } else if (stage === "pay") {
                setStage("bill");
              } else if (stage === "receipt") {
                setStage("pay");
              } else {
                router.back();
              }
            }}
            style={{ background: "transparent", border: 0, padding: 8, cursor: "pointer", display: "grid", placeItems: "center" }}
            aria-label="Back"
          >
            <IC.back />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold tracking-[-0.005em] text-ink">
              {stage === "bill" ? "Take payment" : stage === "pay" ? "Receive payment" : "Done"}
            </div>
            <div className="text-[11px] text-ink-3 font-mono mt-0.5 tracking-[0.04em]">
              {baseBooking.id} · with {baseBooking.stylist}
            </div>
          </div>
          <div className="flex-shrink-0">
            <Avatar initials={baseBooking.customer.initials || "WC"} tone={baseBooking.customer.tone} className="w-8 h-8 text-xs font-bold" />
          </div>
        </header>

        <main className={`p-5 flex-1 overflow-y-auto ${stage === "bill" ? "pb-[90px]" : "pb-6"} max-md:pb-[100px]`}>
          {stage === "bill" && (
            <>
              <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 mt-3.5 mb-2 first:mt-0">Customer</div>
              <div className="flex items-center gap-3 p-[12px_14px] bg-white border border-line rounded-xl mb-4">
                <Avatar initials={baseBooking.customer.initials || "WC"} tone={baseBooking.customer.tone} className="w-10 h-10 text-sm font-bold" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-ink">{baseBooking.customer.name}</div>
                  <div className="text-xs text-ink-3 mt-0.5">{baseBooking.customer.phone}</div>
                </div>
              </div>

              <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 mt-3.5 mb-2">Bill items</div>
              <div className="bg-white border border-line rounded-xl p-1.5 mb-4">
                {items.length === 0 ? (
                  <div className="p-6 text-center text-ink-3 text-sm">
                    No items on the bill. Please add a product or service.
                  </div>
                ) : (
                  items.map((it) => (
                    <div key={it.id} className="grid grid-cols-[1fr_auto_28px] gap-3 p-3 items-center border-b border-line last:border-b-0">
                      <div>
                        <div className="text-sm font-semibold text-ink">{it.name}</div>
                        <div className="inline-flex items-center gap-1.5 mt-2 bg-bg-2 rounded-lg p-0.5 w-max">
                          <button
                            className="w-[26px] h-[26px] rounded-md border-0 bg-white text-ink-2 cursor-pointer grid place-items-center hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={() => updateQty(it.id, -1)}
                            disabled={it.qty <= 1}
                            aria-label="Decrease quantity"
                          >
                            <IC.minus />
                          </button>
                          <span className="text-[13px] font-semibold min-w-[14px] text-center text-ink">{it.qty}</span>
                          <button
                            className="w-[26px] h-[26px] rounded-md border-0 bg-white text-ink-2 cursor-pointer grid place-items-center hover:bg-bg"
                            onClick={() => updateQty(it.id, 1)}
                            aria-label="Increase quantity"
                          >
                            <IC.plus />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-ink-3 block font-mono">
                          {it.qty} × ₹{it.price}
                        </span>
                        <span className="text-sm font-semibold text-ink font-mono">
                          ₹{(it.qty * it.price).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <button
                        className="w-7 h-7 rounded-md border-0 bg-transparent text-ink-4 cursor-pointer grid place-items-center hover:bg-rose-soft hover:text-rose transition-colors duration-150"
                        onClick={() => removeItem(it.id)}
                        aria-label="Remove item"
                      >
                        <IC.x />
                      </button>
                    </div>
                  ))
                )}

                <div className="relative">
                  <button
                    className="flex items-center justify-center gap-1.5 w-full p-3 border-0 bg-transparent border-t border-line font-inherit text-[13px] text-teal font-medium cursor-pointer rounded-none hover:bg-teal-soft transition-colors duration-150"
                    onClick={() => setShowAddMenu(!showAddMenu)}
                  >
                    <IC.plus /> Add product / service
                  </button>

                  {showAddMenu && (
                    <div className="absolute bottom-[100%] left-0 right-0 bg-white border border-line-2 rounded-xl z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.1)] max-h-[250px] overflow-y-auto mb-1">
                      <div className="p-[8px_12px_4px] text-[10px] font-semibold text-ink-3 uppercase tracking-[0.04em] border-b border-line bg-bg-2">
                        Select Service / Product
                      </div>
                      {availableServices.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            handleAddService(item.name, item.price, item.id ? String(item.id) : undefined);
                            setShowAddMenu(false);
                          }}
                          className="flex justify-between items-center w-full p-[10px_14px] border-0 border-b border-line last:border-b-0 bg-transparent cursor-pointer text-[13px] text-left hover:bg-bg-2 transition-colors duration-150"
                        >
                          <span className="text-ink font-medium">
                            {item.name}
                            {item.kind === "bundle" && <span className="ml-1.5 text-[10px] text-teal bg-teal-soft border border-teal-soft-2 rounded-full px-1.5 py-0.5 uppercase tracking-[0.04em]">Combo</span>}
                          </span>
                          <strong className="text-teal font-semibold font-mono">₹{item.price}</strong>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 mt-3.5 mb-2">Adjustments</div>
              <div className="bg-white border border-line rounded-xl p-[4px_16px] mb-4">
                <div className="flex flex-col gap-2.5 py-3 border-b border-line text-sm font-medium text-ink">
                  <div className="flex justify-between items-center gap-4">
                    <span>Discount</span>
                    <div className="inline-flex bg-bg-2 rounded-lg p-0.5">
                      {(["amount", "percent"] as DiscountType[]).map((type) => (
                        <button
                          key={type}
                          className={`h-8 min-w-9 px-2 rounded-md border-0 text-xs font-semibold cursor-pointer ${
                            discountType === type ? "bg-white text-teal shadow-sm" : "bg-transparent text-ink-3"
                          }`}
                          onClick={() => {
                            setDiscountType(type);
                            setDiscountValue(0);
                          }}
                        >
                          {type === "amount" ? "₹" : "%"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1 bg-bg-2 rounded-lg px-2.5 h-9 font-mono flex-1">
                      <span className="text-ink-3">{discountType === "amount" ? "₹" : "%"}</span>
                      <input
                        type="number"
                        value={discountValue || ""}
                        placeholder="0"
                        className="w-full h-full border-0 outline-0 bg-transparent text-sm text-ink text-right"
                        onChange={(e) => {
                          const next = Math.max(0, parseFloat(e.target.value) || 0);
                          setDiscountValue(discountType === "percent" ? Math.min(100, next) : next);
                        }}
                      />
                    </div>
                    <div className="text-xs text-rose font-mono min-w-[92px] text-right">
                      − ₹{discountAmount.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 py-3 border-b border-line">
                  <div className="flex justify-between items-center text-sm font-medium text-ink">
                    <span>Tip for stylist</span>
                    <span className="font-mono text-teal font-semibold">₹{tip}</span>
                  </div>
                  <div className="flex w-full gap-1.5">
                    {[0, 50, 100, 200].map((v) => (
                      <button
                        key={v}
                        className={`h-[30px] px-2.5 rounded-lg border font-inherit text-xs cursor-pointer flex-1 text-center transition-all duration-150 ${
                          tip === v 
                            ? "bg-teal border-teal text-white font-medium" 
                            : "border-line bg-white text-ink-2 hover:border-ink-3"
                        }`}
                        onClick={() => setTip(v)}
                      >
                        {v === 0 ? "None" : `₹${v}`}
                      </button>
                    ))}
                    <div className="flex items-center gap-1 bg-bg-2 rounded-lg px-2.5 h-9 font-mono flex-[1.5] min-w-[80px]">
                      <span className="text-ink-3">₹</span>
                      <input
                        type="number"
                        value={tip || ""}
                        placeholder="Custom"
                        className="w-full h-full border-0 outline-0 bg-transparent text-sm text-ink text-right"
                        onChange={(e) => setTip(Math.max(0, parseInt(e.target.value) || 0))}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3 text-sm font-medium text-ink">
                  <span>Round off to nearest ₹10</span>
                  <label className="inline-flex cursor-pointer items-center relative shrink-0">
                    <input
                      type="checkbox"
                      className="absolute opacity-0 pointer-events-none peer"
                      checked={roundOff}
                      onChange={(e) => setRoundOff(e.target.checked)}
                    />
                    <span className="w-9 h-5.5 rounded-full bg-line-2 relative transition-colors duration-150 before:content-[''] before:absolute before:left-[2px] before:top-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform before:duration-[180ms] before:ease-[cubic-bezier(0.2,0.9,0.3,1.2)] before:shadow-[0_1px_2px_rgba(0,0,0,0.1)] peer-checked:bg-teal peer-checked:before:translate-x-[14px]"></span>
                  </label>
                </div>
              </div>

              {/* Optional B2B Section (collapsible) */}
              {isGstEnabled && (
                <div className="bg-white border border-line rounded-xl p-[14px_18px] mb-3">
                  <button
                    type="button"
                    className="flex justify-between items-center w-full text-sm font-semibold text-ink cursor-pointer outline-none bg-transparent border-0 p-0"
                    onClick={() => setShowB2b(!showB2b)}
                  >
                    <span>Add business GST details (B2B)</span>
                    <span className={`transform transition-transform duration-200 ${showB2b ? "rotate-180" : ""}`}>
                      <IC.chev width={16} height={16} />
                    </span>
                  </button>
                  {showB2b && (
                    <div className="mt-4 flex flex-col gap-3.5 border-t border-line pt-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Customer GSTIN</label>
                        <input
                          type="text"
                          value={customerGstin}
                          maxLength={15}
                          placeholder="e.g. 27AABCU9603R1ZM"
                          className="w-full bg-transparent border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-teal font-mono uppercase tracking-[0.05em]"
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
                            setCustomerGstin(val);
                            if (val.length === 15) {
                              const result = validateGstin(val);
                              if (result.valid && result.stateCode && result.stateName) {
                                setCustomerBillingState(result.stateName);
                                setCustomerBillingStateCode(result.stateCode);
                              }
                            }
                          }}
                        />
                        {customerGstin && !validateGstin(customerGstin).valid && (
                          <span className="text-xs text-rose">Invalid GSTIN format</span>
                        )}
                        {customerGstin && validateGstin(customerGstin).valid && (
                          <span className="text-xs text-teal-ink flex items-center gap-1 font-medium">
                            ✓ {customerBillingState} ({customerBillingStateCode}) 
                            {isIgst ? " · Inter-state (IGST will apply)" : " · Intra-state (CGST + SGST will apply)"}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Business Name</label>
                        <input
                          type="text"
                          value={customerBusinessName}
                          placeholder="Legal business name"
                          className="w-full bg-transparent border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-teal"
                          onChange={(e) => setCustomerBusinessName(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Billing Address</label>
                        <textarea
                          value={customerBillingAddress}
                          placeholder="Full address"
                          rows={2}
                          className="w-full bg-transparent border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-teal resize-none"
                          onChange={(e) => setCustomerBillingAddress(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <TotalSummary
                subtotal={subtotal}
                discount={discountAmount}
                discountType={discountType}
                discountValue={discountValue}
                tip={tip}
                roundOffAmt={roundOffAmt}
                total={total}
                amountPaid={existingPaidAmount}
                amountDue={balanceDue}
                gstBreakdown={gstBreakdown}
              />
            </>
          )}

          {stage === "pay" && (
            <>
              <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 mt-3.5 mb-2 first:mt-0">Payment outcome</div>
              <div className="grid grid-cols-3 gap-2 mb-4 max-sm:grid-cols-1">
                {[
                  { id: "full", label: "Collect full", desc: `₹${balanceDue.toLocaleString("en-IN")}` },
                  { id: "partial", label: "Partial", desc: "Collect some now" },
                  { id: "due", label: "Due", desc: "Collect later" },
                ].map((option) => (
                  <button
                    key={option.id}
                    className={`border rounded-xl p-3 text-left cursor-pointer font-inherit transition-all duration-150 ${
                      paymentMode === option.id
                        ? "border-teal bg-teal-soft text-teal-ink"
                        : "border-line bg-white text-ink"
                    }`}
                    onClick={() => setPaymentMode(option.id as PaymentMode)}
                  >
                    <div className="text-sm font-semibold">{option.label}</div>
                    <div className="text-[11px] text-ink-3 mt-0.5">{option.desc}</div>
                  </button>
                ))}
              </div>

              {paymentMode === "partial" && (
                <div className="bg-white border border-line rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-ink">Amount received now</label>
                    <div className="flex items-center gap-1 bg-bg-2 rounded-lg px-2.5 h-10 font-mono min-w-[150px]">
                      <span className="text-ink-3">₹</span>
                      <input
                        type="number"
                        value={partialAmount || ""}
                        placeholder="0"
                        className="w-full h-full border-0 outline-0 bg-transparent text-sm text-ink text-right"
                        onChange={(e) => setPartialAmount(Math.min(balanceDue, Math.max(0, parseInt(e.target.value) || 0)))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-ink-3 mt-2">
                    <span>Balance after this payment</span>
                    <strong className="font-mono text-ink">₹{amountDueAfterCollection.toLocaleString("en-IN")}</strong>
                  </div>
                </div>
              )}

              {paymentMode !== "due" && (
                <>
                  <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 mt-3.5 mb-2">Payment method</div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {PAYMENT_METHODS.filter((m) => m.id !== "split").map((m) => (
                  <button
                    key={m.id}
                    className={`border rounded-xl p-3.5 text-left cursor-pointer font-inherit transition-all duration-150 hover:border-line-2 ${
                      method === m.id 
                        ? "border-teal bg-teal-soft text-teal-ink" 
                        : "border-line bg-white text-ink"
                    }`}
                    onClick={() => setMethod(m.id)}
                  >
                    <div className={`w-9 h-9 rounded-lg grid place-items-center mb-2.5 ${
                      method === m.id ? "bg-teal text-white" : "bg-bg-2 text-ink-2"
                    }`}>
                      {m.icon === "upi" && <IC.upi />}
                      {m.icon === "card" && <IC.card />}
                      {m.icon === "cash" && <IC.cash />}
                      {m.icon === "split" && <IC.split />}
                    </div>
                    <div className="text-sm font-semibold text-ink">{m.label}</div>
                    <div className="text-[11px] text-ink-3 mt-0.5">{m.desc}</div>
                  </button>
                    ))}
                  </div>
                </>
              )}

              <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 mt-3.5 mb-2">Amount to collect</div>
              <div className="text-[48px] font-semibold tracking-[-0.03em] text-center py-5 text-teal bg-teal-soft rounded-xl border border-teal-soft-2 mb-3.5 flex items-center justify-center font-mono">
                <span className="text-2xl text-ink-3 mr-1 self-start mt-2">₹</span>
                {collectAmount.toLocaleString("en-IN")}
              </div>

              {paymentMode === "due" && (
                <div className="bg-white border border-line rounded-xl p-[18px]">
                  <div className="text-sm font-semibold text-ink">No money collected now</div>
                  <div className="text-xs text-ink-3 mt-1">The service will be completed and ₹{balanceDue.toLocaleString("en-IN")} will stay due on this booking.</div>
                  <button
                    className="btn btn-primary btn-lg w-full mt-3.5"
                    disabled={submitting}
                    onClick={() => finishPayment({ method: "Due", received: 0 })}
                  >
                    {submitting ? "Saving..." : "Mark payment due"}
                  </button>
                </div>
              )}
              {paymentMode !== "due" && method === "upi" && <UpiPanel total={collectAmount} onDone={finishPayment} customerName={baseBooking.customer.name} disabled={submitting || collectAmount <= 0} />}
              {paymentMode !== "due" && method === "cash" && (
                <CashPanel
                  total={collectAmount}
                  onDone={finishPayment}
                  cashReceived={cashReceived}
                  setCashReceived={setCashReceived}
                  changeToReturn={changeToReturn}
                  quickAmounts={quickAmounts}
                  disabled={submitting || collectAmount <= 0}
                />
              )}
              {paymentMode !== "due" && method === "card" && (
                <CardPanel
                  total={collectAmount}
                  onDone={finishPayment}
                  cardWaiting={cardWaiting}
                  disabled={submitting || collectAmount <= 0}
                />
              )}
            </>
          )}

          {stage === "receipt" && payment && (
            <Receipt
              items={items}
              total={total}
              discount={discountAmount}
              tip={tip}
              payment={payment}
              customer={baseBooking.customer}
              amountPaid={existingPaidAmount}
              amountDue={payment.amountDue}
              invoiceShareToken={invoiceShareToken}
              gstBreakdown={gstBreakdown}
              onWhatsApp={() => triggerFlash("Receipt sent on WhatsApp ✓")}
              onPrint={() => triggerFlash("Sent to printer ✓")}
              onClose={() => router.push("/dashboard")}
            />
          )}
        </main>

        {stage === "bill" && (
          <div className="p-[14px_18px] bg-white/94 backdrop-blur-[8px] border-t border-line flex items-center justify-between gap-4 sticky bottom-0 z-30">
            <div className="flex flex-col">
              <span className="text-[11px] text-ink-3 uppercase tracking-[0.04em] font-semibold">
                {existingPaidAmount > 0 ? "BALANCE DUE" : "TOTAL TO COLLECT"}
              </span>
              <span className="text-2xl font-semibold tracking-[-0.02em] text-teal mt-0.5 font-mono">₹{balanceDue.toLocaleString("en-IN")}</span>
            </div>
            <button 
              className="btn btn-primary btn-lg" 
              onClick={() => setStage("pay")} 
              disabled={items.length === 0} 
              style={items.length === 0 ? { opacity: 0.5 } : {}}
            >
              {existingPaidAmount > 0 ? "Collect balance" : "Take payment"} <span aria-hidden>→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== BILL EDITOR SUB-COMPONENTS =====

interface TotalSummaryProps {
  subtotal: number;
  discount: number;
  discountType: DiscountType;
  discountValue: number;
  tip: number;
  roundOffAmt: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  gstBreakdown?: GstTaxBreakdown | null;
}

function TotalSummary({ subtotal, discount, discountType, discountValue, tip, roundOffAmt, total, amountPaid, amountDue, gstBreakdown }: TotalSummaryProps) {
  return (
    <div className="bg-white border border-line rounded-xl p-[14px_18px]">
      <div className="flex justify-between items-center py-1.5 text-[13px] text-ink-2">
        <span>Subtotal</span>
        <span className="font-mono">₹{subtotal.toLocaleString("en-IN")}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between items-center py-1.5 text-[13px] text-rose">
          <span>Discount{discountType === "percent" ? ` (${discountValue}%)` : ""}</span>
          <span className="font-mono">− ₹{discount.toLocaleString("en-IN")}</span>
        </div>
      )}
      {gstBreakdown && (
        <>
          <div className="flex justify-between items-center py-1 text-[12px] text-ink-3">
            <span>Taxable value</span>
            <span className="font-mono">₹{gstBreakdown.taxableAmount.toLocaleString("en-IN")}</span>
          </div>
          {gstBreakdown.isIgst ? (
            <div className="flex justify-between items-center py-1 text-[12px] text-ink-3">
              <span>IGST ({gstBreakdown.igstRate}%)</span>
              <span className="font-mono">₹{gstBreakdown.igstAmount.toLocaleString("en-IN")}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center py-1 text-[12px] text-ink-3">
                <span>CGST ({gstBreakdown.cgstRate}%)</span>
                <span className="font-mono">₹{gstBreakdown.cgstAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center py-1 text-[12px] text-ink-3">
                <span>SGST ({gstBreakdown.sgstRate}%)</span>
                <span className="font-mono">₹{gstBreakdown.sgstAmount.toLocaleString("en-IN")}</span>
              </div>
            </>
          )}
        </>
      )}
      {tip > 0 && (
        <div className="flex justify-between items-center py-1.5 text-[13px] text-ink-2">
          <span>Tip for stylist</span>
          <span className="font-mono">+ ₹{tip.toLocaleString("en-IN")}</span>
        </div>
      )}
      {roundOffAmt !== 0 && (
        <div className="flex justify-between items-center py-1.5 text-[13px] text-ink-2">
          <span>Round off</span>
          <span className="font-mono">
            {roundOffAmt > 0 ? "+" : "−"} ₹{Math.abs(roundOffAmt)}
          </span>
        </div>
      )}
      <div className="flex justify-between items-center pt-2.5 mt-1.5 border-t border-line text-base font-semibold text-ink">
        <span>Bill total</span>
        <span className="text-teal text-[22px] tracking-[-0.02em] font-mono">₹{total.toLocaleString("en-IN")}</span>
      </div>
      {amountPaid > 0 && (
        <div className="flex justify-between items-center py-1.5 text-[13px] text-green">
          <span>Already paid</span>
          <span className="font-mono">₹{amountPaid.toLocaleString("en-IN")}</span>
        </div>
      )}
      <div className="flex justify-between items-center py-1.5 text-[13px] text-ink-2">
        <span>Balance due</span>
        <span className="font-mono">₹{amountDue.toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}

// ===== PAYMENT FLOW SUB-COMPONENTS =====

interface UpiPanelProps {
  total: number;
  onDone: (p: PaymentSubmission) => void;
  customerName: string;
  disabled?: boolean;
}

function UpiPanel({ total, onDone, customerName, disabled }: UpiPanelProps) {
  return (
    <div className="bg-white border border-line rounded-xl p-[18px]">
      <div className="grid grid-cols-2 gap-4 items-center mb-4 max-sm:grid-cols-1">
        <div className="aspect-square bg-white border border-line rounded-xl p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=glowsalon@okaxis&pn=Glow%20Salon&am=${total}&cu=INR&tn=Payment%20for%20salon%20services`)}`}
            alt="UPI QR Code"
            className="w-full h-auto rounded-lg block"
          />
        </div>
        <div className="text-sm text-ink">
          <div className="text-[28px] font-semibold tracking-[-0.025em] text-ink font-mono">₹{total.toLocaleString("en-IN")}</div>
          <div className="text-xs text-ink-3 mt-1 font-mono">glowsalon@okaxis</div>
          <div className="text-xs text-ink-2 mt-2.5 leading-relaxed">Ask {customerName.split(" ")[0]} to scan with GPay, PhonePe, Paytm or BHIM</div>
        </div>
      </div>
      <div className="flex justify-between gap-1.5 mt-3.5">
        <div className="flex-1 py-2 text-center bg-bg-2 rounded-lg text-[11px] font-semibold text-ink-2 font-mono">GPay</div>
        <div className="flex-1 py-2 text-center bg-bg-2 rounded-lg text-[11px] font-semibold text-ink-2 font-mono">PhonePe</div>
        <div className="flex-1 py-2 text-center bg-bg-2 rounded-lg text-[11px] font-semibold text-ink-2 font-mono">Paytm</div>
        <div className="flex-1 py-2 text-center bg-bg-2 rounded-lg text-[11px] font-semibold text-ink-2 font-mono">BHIM</div>
      </div>
      <button 
        className="btn btn-outline btn-sm w-full mt-3.5 justify-center flex items-center gap-1.5" 
        onClick={() => navigator.clipboard.writeText("upi://pay?pa=glowsalon@okaxis&am=" + total)}
        disabled={disabled}
      >
        <IC.copy /> Copy UPI payment link
      </button>
      <div className="flex items-center gap-2 justify-center mt-3.5 text-xs text-ink-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber"></span>
        </span>
        Waiting for UPI payment notification…
      </div>
      <button
        className="btn btn-primary btn-lg w-full mt-3.5"
        disabled={disabled}
        onClick={() => onDone({ method: "UPI · glowsalon@okaxis", received: total })}
      >
        {disabled ? "Processing..." : "I've received the payment"}
      </button>
    </div>
  );
}

interface CashPanelProps {
  total: number;
  onDone: (p: PaymentSubmission) => void;
  cashReceived: number;
  setCashReceived: (val: number) => void;
  changeToReturn: number;
  quickAmounts: number[];
  disabled?: boolean;
}

function CashPanel({
  total,
  onDone,
  cashReceived,
  setCashReceived,
  changeToReturn,
  quickAmounts,
  disabled,
}: CashPanelProps) {
  const isShort = cashReceived < total;
  return (
    <div className="bg-white border border-line rounded-xl p-[18px]">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-ink-3">Cash received</label>
        <div className="flex items-center gap-2.5 bg-bg-2 rounded-xl p-[14px_18px] font-mono">
          <span className="text-[28px] text-ink-3 font-semibold">₹</span>
          <input
            type="number"
            value={cashReceived || ""}
            className="flex-1 border-0 outline-0 bg-transparent text-[36px] font-semibold text-ink tracking-[-0.02em] min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            onChange={(e) => setCashReceived(Math.max(0, parseInt(e.target.value) || 0))}
            autoFocus
            disabled={disabled}
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 mt-3">
        {quickAmounts.map((v) => (
          <button
            key={v}
            className="py-2.5 border border-line bg-white rounded-lg font-mono text-[13px] font-medium text-ink-2 cursor-pointer hover:border-ink-3 hover:text-ink disabled:opacity-50"
            onClick={() => setCashReceived(v)}
            disabled={disabled}
          >
            ₹{v.toLocaleString("en-IN")}
          </button>
        ))}
      </div>
      <div className={`flex justify-between items-center p-[14px_18px] mt-3 border rounded-xl ${
        isShort ? "bg-rose-soft border-[#F1C6BB]" : "bg-green-soft border-[#C2EAD0]"
      }`}>
        <div className={`text-[13px] font-medium ${isShort ? "text-rose" : "text-green"}`}>
          {isShort ? "Short by" : "Change to return"}
        </div>
        <div className={`text-2xl font-semibold tracking-[-0.015em] font-mono ${isShort ? "text-rose" : "text-green"}`}>
          ₹{Math.abs(cashReceived - total).toLocaleString("en-IN")}
        </div>
      </div>
      <button
        className="btn btn-primary btn-lg w-full mt-3.5"
        disabled={isShort || disabled}
        style={(isShort || disabled) ? { opacity: 0.4, cursor: "not-allowed" } : {}}
        onClick={() =>
          onDone({
            method: `Cash · ₹${cashReceived} received, ₹${changeToReturn} change`,
            received: total,
          })
        }
      >
        {disabled ? "Processing..." : "Mark cash received"}
      </button>
    </div>
  );
}

interface CardPanelProps {
  total: number;
  onDone: (p: PaymentSubmission) => void;
  cardWaiting: boolean;
  disabled?: boolean;
}

function CardPanel({ total, onDone, cardWaiting, disabled }: CardPanelProps) {
  return (
    <div className="bg-white border border-line rounded-xl p-[18px] flex flex-col items-center">
      <div className="flex justify-center py-5">
        <svg viewBox="0 0 200 120" width="180" height="108">
          <rect x="10" y="10" width="180" height="100" rx="12" fill="var(--ink)" />
          <rect x="10" y="34" width="180" height="20" fill="#000" opacity="0.4" />
          <rect x="22" y="68" width="32" height="22" rx="3" fill="#D4B65A" />
          <rect x="24" y="70" width="28" height="18" rx="2" fill="none" stroke="#A38A40" strokeWidth="0.5" />
          <line x1="24" y1="74" x2="52" y2="74" stroke="#A38A40" strokeWidth="0.5" />
          <line x1="24" y1="79" x2="52" y2="79" stroke="#A38A40" strokeWidth="0.5" />
          <line x1="24" y1="84" x2="52" y2="84" stroke="#A38A40" strokeWidth="0.5" />
          <line x1="38" y1="70" x2="38" y2="88" stroke="#A38A40" strokeWidth="0.5" />
          <text x="180" y="100" textAnchor="end" fontSize="10" fontFamily="JetBrains Mono" fill="#fff" opacity="0.7">
            **** 4527
          </text>
        </svg>
      </div>
      <div className="text-center py-3.5 bg-bg-2 rounded-xl w-full mb-3.5">
        <div className="text-[11px] text-ink-3 tracking-[0.04em] uppercase">Amount</div>
        <div className="text-3xl font-semibold tracking-[-0.02em] mt-1 font-mono">₹{total.toLocaleString("en-IN")}</div>
      </div>
      <div className="flex items-center gap-2 justify-center mb-3.5 text-xs text-ink-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber"></span>
        </span>
        {cardWaiting ? "Tap, Swipe, or Insert card on the reader…" : "Card detected! Authorizing payment…"}
      </div>
      <button
        className="btn btn-primary btn-lg w-full"
        disabled={disabled}
        onClick={() => onDone({ method: "Card · **** 4527", received: total })}
      >
        {disabled ? "Processing..." : "Card payment received"}
      </button>
    </div>
  );
}

// ===== RECEIPT SUB-COMPONENT =====

interface ReceiptProps {
  items: ServiceItem[];
  total: number;
  discount: number;
  tip: number;
  payment: PaymentInfo;
  customer: Customer;
  amountPaid: number;
  amountDue: number;
  invoiceShareToken?: string | null;
  gstBreakdown?: GstTaxBreakdown | null;
  onWhatsApp: () => void;
  onPrint: () => void;
  onClose: () => void;
}

function Receipt({
  items,
  total,
  discount,
  tip,
  payment,
  customer,
  amountPaid,
  amountDue,
  invoiceShareToken,
  gstBreakdown,
  onWhatsApp,
  onPrint,
  onClose,
}: ReceiptProps) {
  const currentDateStr = useMemo(() => {
    const d = new Date(2026, 4, 19, 13, 42); // Simulated receipt date matching reference
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + " · " + d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  return (
    <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-sm">
      <div className="p-[28px_24px_24px] bg-teal-soft border-b border-teal-soft-2 text-center">
        <div className="flex justify-center mb-[18px]">
          <svg width="64" height="64" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="var(--teal)"
              strokeWidth="2.5"
              className="check-circle"
            />
            <path
              d="M22 41 35 54 58 28"
              fill="none"
              stroke="var(--teal)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="check-tick"
            />
          </svg>
        </div>
        <h2 className="text-[22px] font-semibold tracking-tight m-0 text-ink">
          {payment.status === "paid" ? "Payment received" : payment.status === "partial" ? "Partial payment received" : "Payment due"}
        </h2>
        <p className="text-sm text-teal-ink m-[6px_0_0] font-medium font-mono">
          {payment.received > 0 ? `₹${payment.received.toLocaleString("en-IN")} · ${payment.method}` : `₹${amountDue.toLocaleString("en-IN")} due`}
        </p>
      </div>

      <div className="p-[22px_24px]">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-[13px] text-ink-2">
            <span>Customer</span>
            <strong className="text-ink font-semibold">{customer.name}</strong>
          </div>
          <div className="flex justify-between items-center text-[13px] text-ink-2">
            <span>Date &amp; time</span>
            <strong className="text-ink font-semibold font-mono">{currentDateStr}</strong>
          </div>
          <div className="flex justify-between items-center text-[13px] text-ink-2">
            <span>Receipt ID</span>
            <strong className="text-ink font-semibold font-mono">RC-2026-05189</strong>
          </div>
        </div>
        <div className="h-[1px] bg-line my-4"></div>
        <div className="flex flex-col gap-2">
          {items.map((it) => (
            <div key={it.id} className="flex justify-between items-center text-[13px] text-ink-2">
              <span>
                {it.qty} × {it.name}
              </span>
              <strong className="text-ink font-semibold font-mono">₹{(it.qty * it.price).toLocaleString("en-IN")}</strong>
            </div>
          ))}
          {discount > 0 && (
            <div className="flex justify-between items-center text-[13px] text-rose">
              <span>Discount</span>
              <strong className="font-semibold">− ₹{discount.toLocaleString("en-IN")}</strong>
            </div>
          )}
          {tip > 0 && (
            <div className="flex justify-between items-center text-[13px] text-ink-2">
              <span>Tip</span>
              <strong className="text-ink font-semibold">+ ₹{tip.toLocaleString("en-IN")}</strong>
            </div>
          )}
        </div>
        <div className="h-[1px] bg-line my-4"></div>
        <div className="flex justify-between items-center text-[18px]">
          <strong>Bill total</strong>
          <strong className="text-ink font-semibold font-mono">
            ₹{total.toLocaleString("en-IN")}
          </strong>
        </div>
        <div className="flex justify-between items-center text-[14px] mt-2">
          <span className="text-ink-2 font-medium">Total paid</span>
          <strong className="text-teal font-semibold font-mono">
            ₹{amountPaid.toLocaleString("en-IN")}
          </strong>
        </div>
        {amountDue > 0 && (
          <div className="flex justify-between items-center text-[14px] mt-2">
            <span className="text-ink-2 font-medium">Balance due</span>
            <strong className="text-rose font-semibold font-mono">
              ₹{amountDue.toLocaleString("en-IN")}
            </strong>
          </div>
        )}
      </div>

      {invoiceShareToken && (
        <div className="p-[18px_24px_24px] bg-teal-soft border-t border-dashed border-teal-soft-2 flex flex-col gap-2">
          <div className="flex justify-between items-center text-[13px] text-teal-ink font-medium">
            <span>GST Tax Invoice</span>
            <a
              href={`/api/invoice/${invoiceShareToken}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-xs text-teal font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded bg-white shadow-sm border border-teal-soft-2"
              style={{ textDecoration: "none", height: "auto" }}
            >
              <IC.download width={14} height={14} /> Download PDF
            </a>
          </div>
          {gstBreakdown && (
            <div className="text-xs text-ink-3 flex flex-col gap-1 mt-1 border-t border-teal-soft-2 pt-2">
              <div className="flex justify-between">
                <span>Taxable Value</span>
                <span className="font-mono">₹{gstBreakdown.taxableAmount.toLocaleString("en-IN")}</span>
              </div>
              {gstBreakdown.isIgst ? (
                <div className="flex justify-between">
                  <span>IGST ({gstBreakdown.igstRate}%)</span>
                  <span className="font-mono">₹{gstBreakdown.igstAmount.toLocaleString("en-IN")}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>CGST ({gstBreakdown.cgstRate}%)</span>
                    <span className="font-mono">₹{gstBreakdown.cgstAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST ({gstBreakdown.sgstRate}%)</span>
                    <span className="font-mono">₹{gstBreakdown.sgstAmount.toLocaleString("en-IN")}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="p-[18px_24px_24px] bg-bg border-t border-dashed border-line">
        <button
          className="btn btn-wa btn-lg w-full flex items-center justify-center gap-2"
          style={{ background: "var(--wa)", color: "#fff" }}
          onClick={onWhatsApp}
        >
          <IC.wa /> Send receipt on WhatsApp
        </button>
        <div className="flex gap-2.5 mt-2">
          <button className="btn btn-outline flex-1 justify-center" onClick={onPrint}>
            <IC.print /> Print
          </button>
          <button className="btn btn-outline flex-1 justify-center" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
