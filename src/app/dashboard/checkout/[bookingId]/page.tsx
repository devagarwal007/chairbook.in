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
import { Customer, DbCheckoutServiceItemRow } from "@/types";

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
}

interface PaymentInfo {
  method: string;
  received: number;
}

import { PAYMENT_METHODS } from "@/constants/checkout";

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { salonId } = useProfile();

  const bookingId = (params?.bookingId as string) || "";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbServices, setDbServices] = useState<{ id: string; name: string; price: number }[]>([]);

  // Resolve booking — only for UUID-sourced bookings loaded from DB
  const baseBooking = useMemo(() => {
    return booking || null;
  }, [booking]);

  const [stage, setStage] = useState<"bill" | "pay" | "receipt">("bill");
  const [method, setMethod] = useState<string>("upi");
  const [items, setItems] = useState<ServiceItem[]>(baseBooking?.services || []);
  const [discount, setDiscount] = useState<number>(0);
  const [tip, setTip] = useState<number>(0);
  const [roundOff, setRoundOff] = useState<boolean>(true);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const { show: triggerFlash } = useToast();
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);

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
            customer:customers (id, name, phone),
            stylist:stylists (id, name, tone),
            booking_services (
              qty,
              price_at_booking,
              service:services (id, name, price)
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
            status: data.status
          };

          setBooking(bData);
          setItems(serviceItems);

          // If booking is already paid, fetch payment details and jump to receipt stage
          if (data.status === "Paid") {
            const { data: paymentData, error: paymentError } = await supabase
              .from("payments")
              .select("*")
              .eq("booking_id", bookingId)
              .maybeSingle();

            if (!paymentError && paymentData) {
              setPayment({
                method: paymentData.method,
                received: Number(paymentData.amount)
              });
              setDiscount(Number(paymentData.discount || 0));
              setTip(Number(paymentData.tip || 0));
              setStage("receipt");
            } else {
              // Fallback if payment details aren't found
              setPayment({
                method: "Completed",
                received: serviceItems.reduce((s, i) => s + i.qty * i.price, 0)
              });
              setStage("receipt");
            }
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
            .select("id, name, price")
            .eq("salon_id", bookingData.salon_id)
            .eq("active", true);

          if (svcs) {
            setDbServices(svcs.map(s => ({
              id: s.id,
              name: s.name,
              price: Number(s.price)
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
      setDiscount(0);
      setTip(0);
      setRoundOff(true);
      setPayment(null);
      setStage("bill");
    });
  }, [bookingId]);

  const subtotal = useMemo(() => {
    return items.reduce((s, i) => s + i.qty * i.price, 0);
  }, [items]);

  const beforeRound = useMemo(() => {
    return Math.max(0, subtotal - discount + tip);
  }, [subtotal, discount, tip]);

  const roundedTotal = useMemo(() => {
    return roundOff ? Math.round(beforeRound / 10) * 10 : beforeRound;
  }, [beforeRound, roundOff]);

  const roundOffAmt = useMemo(() => {
    return roundedTotal - beforeRound;
  }, [roundedTotal, beforeRound]);

  const total = roundedTotal;

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



  const finishPayment = async (p: PaymentInfo) => {
    if (!baseBooking) return;
    if (submitting) return;
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
              amount: total,
            };

            if (tip > 0) insertPayload.tip = tip;
            if (discount > 0) insertPayload.discount = discount;

            const { error: paymentError } = await supabase
              .from("payments")
              .upsert(insertPayload, { onConflict: "booking_id" });

            if (paymentError) {
              console.error("Payment insert error:", paymentError);
              // Don't throw — still complete the flow
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
              .update({ status: "Paid" })
              .eq("id", bookingId);

            if (statusError) throw statusError;

            if (salonId) {
              insertNotification({
                salon_id: salonId,
                type: "payment",
                title: "Payment received",
                body: `₹${total.toLocaleString("en-IN")} received from ${baseBooking.customer.name} via ${p.method}`,
                meta: { booking_id: bookingId, amount: total, method: p.method },
              });
            }

          } catch (err) {
            console.error("Failed to save payment to Supabase:", err);
            alert("Failed to record payment in database, but marking as paid in UI.");
          }
        }
      }

      setPayment(p);
      setStage("receipt");
    } finally {
      setSubmitting(false);
    }
  };

  // Cash payment details
  const [cashReceived, setCashReceived] = useState<number>(0);
  const changeToReturn = useMemo(() => {
    return Math.max(0, cashReceived - total);
  }, [cashReceived, total]);

  // Set default cash received value when total updates
  useEffect(() => {
    queueMicrotask(() => {
      setCashReceived(total);
    });
  }, [total]);

  // Quick cash options
  const quickAmounts = useMemo(() => {
    const arr = [
      total,
      Math.ceil(total / 100) * 100,
      Math.ceil(total / 500) * 500,
      Math.ceil(total / 500) * 500 + 500,
    ];
    return Array.from(new Set(arr)).slice(0, 4);
  }, [total]);

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
                          <span className="text-ink font-medium">{item.name}</span>
                          <strong className="text-teal font-semibold font-mono">₹{item.price}</strong>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 mt-3.5 mb-2">Adjustments</div>
              <div className="bg-white border border-line rounded-xl p-[4px_16px] mb-4">
                <div className="flex justify-between items-center gap-4 py-3 border-b border-line text-sm font-medium text-ink">
                  <span>Discount</span>
                  <div className="flex items-center gap-1 bg-bg-2 rounded-lg px-2.5 h-9 font-mono">
                    <span className="text-ink-3">₹</span>
                    <input
                      type="number"
                      value={discount || ""}
                      placeholder="0"
                      className="w-[60px] h-full border-0 outline-0 bg-transparent text-sm text-ink text-right"
                      onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                    />
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

              <TotalSummary
                subtotal={subtotal}
                discount={discount}
                tip={tip}
                roundOffAmt={roundOffAmt}
                total={total}
              />
            </>
          )}

          {stage === "pay" && (
            <>
              <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 mt-3.5 mb-2 first:mt-0">Payment method</div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PAYMENT_METHODS.map((m) => (
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

              <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 mt-3.5 mb-2">Amount to collect</div>
              <div className="text-[48px] font-semibold tracking-[-0.03em] text-center py-5 text-teal bg-teal-soft rounded-xl border border-teal-soft-2 mb-3.5 flex items-center justify-center font-mono">
                <span className="text-2xl text-ink-3 mr-1 self-start mt-2">₹</span>
                {total.toLocaleString("en-IN")}
              </div>

              {method === "upi" && <UpiPanel total={total} onDone={finishPayment} customerName={baseBooking.customer.name} disabled={submitting} />}
              {method === "cash" && (
                <CashPanel
                  total={total}
                  onDone={finishPayment}
                  cashReceived={cashReceived}
                  setCashReceived={setCashReceived}
                  changeToReturn={changeToReturn}
                  quickAmounts={quickAmounts}
                  disabled={submitting}
                />
              )}
              {method === "card" && (
                <CardPanel
                  total={total}
                  onDone={finishPayment}
                  cardWaiting={cardWaiting}
                  disabled={submitting}
                />
              )}
              {method === "split" && (
                <div className="p-6 bg-bg-2 rounded-xl text-xs text-ink-3 text-center border border-dashed border-line">
                  Split payment — coming soon. Use individual methods for now.
                </div>
              )}
            </>
          )}

          {stage === "receipt" && payment && (
            <Receipt
              items={items}
              total={total}
              discount={discount}
              tip={tip}
              payment={payment}
              customer={baseBooking.customer}
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
                TOTAL TO COLLECT
              </span>
              <span className="text-2xl font-semibold tracking-[-0.02em] text-teal mt-0.5 font-mono">₹{total.toLocaleString("en-IN")}</span>
            </div>
            <button 
              className="btn btn-primary btn-lg" 
              onClick={() => setStage("pay")} 
              disabled={items.length === 0} 
              style={items.length === 0 ? { opacity: 0.5 } : {}}
            >
              Take payment <span aria-hidden>→</span>
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
  tip: number;
  roundOffAmt: number;
  total: number;
}

function TotalSummary({ subtotal, discount, tip, roundOffAmt, total }: TotalSummaryProps) {
  return (
    <div className="bg-white border border-line rounded-xl p-[14px_18px]">
      <div className="flex justify-between items-center py-1.5 text-[13px] text-ink-2">
        <span>Subtotal</span>
        <span className="font-mono">₹{subtotal.toLocaleString("en-IN")}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between items-center py-1.5 text-[13px] text-rose">
          <span>Discount</span>
          <span className="font-mono">− ₹{discount.toLocaleString("en-IN")}</span>
        </div>
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
        <span>Total to collect</span>
        <span className="text-teal text-[22px] tracking-[-0.02em] font-mono">₹{total.toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}

// ===== PAYMENT FLOW SUB-COMPONENTS =====

interface UpiPanelProps {
  total: number;
  onDone: (p: PaymentInfo) => void;
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
  onDone: (p: PaymentInfo) => void;
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
  onDone: (p: PaymentInfo) => void;
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
          Payment received
        </h2>
        <p className="text-sm text-teal-ink m-[6px_0_0] font-medium font-mono">
          ₹{total.toLocaleString("en-IN")} · {payment.method}
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
          <strong>Total paid</strong>
          <strong className="text-teal font-semibold font-mono">
            ₹{total.toLocaleString("en-IN")}
          </strong>
        </div>
      </div>

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
