"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useProfile } from "@/context/ProfileContext";
import { insertNotification } from "@/lib/notifications";

// ===== TYPES =====
interface Customer {
  name: string;
  initials: string;
  tone: string;
  phone: string;
}

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
}

interface PaymentInfo {
  method: string;
  received: number;
}

// ===== CONSTANTS =====
const PAYMENT_METHODS = [
  { id: "upi", label: "UPI / QR", desc: "GPay, PhonePe, Paytm — anyone", icon: "upi" },
  { id: "card", label: "Card", desc: "Credit or debit", icon: "card" },
  { id: "cash", label: "Cash", desc: "Counter cash", icon: "cash" },
  { id: "split", label: "Split", desc: "Mix UPI + cash + tip", icon: "split" },
];

// ===== ICONS =====
const IC = {
  back: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  check: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  plus: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  minus: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 12h14" />
    </svg>
  ),
  upi: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM14 20h3M20 14v3M20 20h.01M17 14h.01M20 17h.01" />
    </svg>
  ),
  card: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  ),
  cash: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 6v.01M18 18v.01" />
    </svg>
  ),
  split: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 6h13l5 6-5 6H3M16 6v12" />
    </svg>
  ),
  wa: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...p}>
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.6-.9-2.2-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.2 3.2.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.3c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
    </svg>
  ),
  x: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  print: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
    </svg>
  ),
  copy: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
};

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
  const [flash, setFlash] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);

  // Fetch Booking details if UUID
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);

    if (!isUuid || !supabase) {
      setBooking(null);
      setItems([]);
      setLoading(false);
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

          const serviceItems: ServiceItem[] = (data.booking_services || []).map((bs: any, idx: number) => ({
            id: idx + 1,
            name: bs.service?.name || "Unknown Service",
            qty: bs.qty || 1,
            price: Number(bs.price_at_booking),
            service_id: bs.service?.id
          }));

          const bData: Booking = {
            id: data.id,
            customer: {
              name: custName,
              initials: custInitials,
              tone: stylistObj?.tone ? cleanTone(stylistObj.tone) : "b",
              phone: customerObj?.phone || ""
            },
            stylist: stylistObj?.name || "Unassigned",
            services: serviceItems
          };

          setBooking(bData);
          setItems(serviceItems);
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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
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
  }, [booking?.id]);

  const availableServices = dbServices.length > 0
    ? dbServices
    : [];

  // Sync state if booking ID changes
  useEffect(() => {
    if (booking) {
      setItems(booking.services);
    } else {
      setItems([]);
    }
    setDiscount(0);
    setTip(0);
    setRoundOff(true);
    setPayment(null);
    setStage("bill");
  }, [booking, bookingId]);

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

  const triggerFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1800);
  };

  const finishPayment = async (p: PaymentInfo) => {
    if (!baseBooking) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
    if (isUuid) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        try {
          let paymentMethod: 'UPI' | 'Cash' | 'Card' = 'UPI';
          if (p.method.toLowerCase().includes('cash')) paymentMethod = 'Cash';
          else if (p.method.toLowerCase().includes('card')) paymentMethod = 'Card';

          const insertPayload: any = {
            booking_id: bookingId,
            method: paymentMethod,
            amount: total,
          };

          if (tip > 0) insertPayload.tip = tip;
          if (discount > 0) insertPayload.discount = discount;

          const { error: paymentError } = await supabase
            .from("payments")
            .insert(insertPayload);

          if (paymentError) {
            console.error("Payment insert error:", paymentError);
            // Don't throw — still complete the flow
          }

          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const canSyncServices = items.every(it => {
            const sId = it.service_id || dbServices.find(ds => ds.name === it.name)?.id;
            return sId && uuidRegex.test(String(sId));
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
  };

  // Cash payment details
  const [cashReceived, setCashReceived] = useState<number>(0);
  const changeToReturn = useMemo(() => {
    return Math.max(0, cashReceived - total);
  }, [cashReceived, total]);

  // Set default cash received value when total updates
  useEffect(() => {
    setCashReceived(total);
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
      setCardWaiting(true);
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
    <div className="ck-stage">
      <div className="ck-frame">
        <header className="ck-top">
          <button
            className="book-back"
            onClick={() => {
              if (stage === "pay") {
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
          <div className="ck-top-title">
            <div className="ck-top-l">
              {stage === "bill" ? "Take payment" : stage === "pay" ? "Receive payment" : "Done"}
            </div>
            <div className="ck-top-sub mono">
              {baseBooking.id} · with {baseBooking.stylist}
            </div>
          </div>
          <div className="ck-customer">
            <div className={`avatar sm tone-${baseBooking.customer.tone}`} style={{ display: "grid", placeItems: "center", fontWeight: "bold" }}>
              {baseBooking.customer.initials}
            </div>
          </div>
        </header>

        <main className="ck-body" style={{ paddingBottom: stage === "bill" ? 90 : 24 }}>
          {stage === "bill" && (
            <>
              <div className="ck-section-lbl">Customer</div>
              <div className="ck-cust-card" style={{ marginBottom: 16 }}>
                <div className={`avatar md tone-${baseBooking.customer.tone}`} style={{ display: "grid", placeItems: "center", fontWeight: "bold" }}>
                  {baseBooking.customer.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{baseBooking.customer.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{baseBooking.customer.phone}</div>
                </div>
              </div>

              <div className="ck-section-lbl">Bill items</div>
              <div className="ck-bill" style={{ marginBottom: 16 }}>
                {items.length === 0 ? (
                  <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
                    No items on the bill. Please add a product or service.
                  </div>
                ) : (
                  items.map((it) => (
                    <div key={it.id} className="ck-bill-row">
                      <div className="ck-bill-main">
                        <div className="ck-bill-name">{it.name}</div>
                        <div className="ck-qty">
                          <button
                            className="ck-qty-btn"
                            onClick={() => updateQty(it.id, -1)}
                            disabled={it.qty <= 1}
                            aria-label="Decrease quantity"
                          >
                            <IC.minus />
                          </button>
                          <span className="ck-qty-val">{it.qty}</span>
                          <button
                            className="ck-qty-btn"
                            onClick={() => updateQty(it.id, 1)}
                            aria-label="Increase quantity"
                          >
                            <IC.plus />
                          </button>
                        </div>
                      </div>
                      <div className="ck-bill-amt">
                        <span className="ck-bill-line mono">
                          {it.qty} × ₹{it.price}
                        </span>
                        <span className="ck-bill-total mono">
                          ₹{(it.qty * it.price).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <button
                        className="ck-bill-remove"
                        onClick={() => removeItem(it.id)}
                        aria-label="Remove item"
                      >
                        <IC.x />
                      </button>
                    </div>
                  ))
                )}

                <div style={{ position: "relative" }}>
                  <button
                    className="ck-add-btn"
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    style={{ width: "100%" }}
                  >
                    <IC.plus /> Add product / service
                  </button>

                  {showAddMenu && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        left: 0,
                        right: 0,
                        background: "#fff",
                        border: "1px solid var(--line-2)",
                        borderRadius: 12,
                        zIndex: 40,
                        boxShadow: "0 -10px 20px rgba(0,0,0,0.1)",
                        maxHeight: 250,
                        overflowY: "auto",
                        marginBottom: 4,
                      }}
                    >
                      <div style={{ padding: "8px 12px 4px", fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--line)" }}>
                        Select Service / Product
                      </div>
                      {availableServices.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            handleAddService(item.name, item.price, item.id ? String(item.id) : undefined);
                            setShowAddMenu(false);
                          }}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                            padding: "10px 14px",
                            border: 0,
                            borderBottom: "1px solid var(--line)",
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: 13,
                            textAlign: "left",
                            fontFamily: "inherit",
                          }}
                        >
                          <span style={{ color: "var(--ink)" }}>{item.name}</span>
                          <strong style={{ color: "var(--teal)" }}>₹{item.price}</strong>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="ck-section-lbl">Adjustments</div>
              <div className="ck-adjust" style={{ marginBottom: 16 }}>
                <div className="ck-adj-row">
                  <span>Discount</span>
                  <div className="ck-adj-input">
                    <span>₹</span>
                    <input
                      type="number"
                      value={discount || ""}
                      placeholder="0"
                      onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                </div>
                <div className="ck-adj-row" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Tip for stylist</span>
                    <span className="mono" style={{ color: "var(--teal)", fontWeight: 600 }}>₹{tip}</span>
                  </div>
                  <div className="ck-tip-chips" style={{ display: "flex", width: "100%", gap: 6 }}>
                    {[0, 50, 100, 200].map((v) => (
                      <button
                        key={v}
                        className={`ck-tip-chip ${tip === v ? "on" : ""}`}
                        onClick={() => setTip(v)}
                        style={{ flex: 1, textAlign: "center" }}
                      >
                        {v === 0 ? "None" : `₹${v}`}
                      </button>
                    ))}
                    <div className="ck-adj-input" style={{ flex: 1.5, minWidth: 80 }}>
                      <span>₹</span>
                      <input
                        type="number"
                        value={tip || ""}
                        placeholder="Custom"
                        style={{ width: "100%" }}
                        onChange={(e) => setTip(Math.max(0, parseInt(e.target.value) || 0))}
                      />
                    </div>
                  </div>
                </div>
                <div className="ck-adj-row">
                  <span>Round off to nearest ₹10</span>
                  <label className="set-toggle">
                    <input
                      type="checkbox"
                      checked={roundOff}
                      onChange={(e) => setRoundOff(e.target.checked)}
                    />
                    <span className="set-toggle-track"></span>
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
              <div className="ck-section-lbl">Payment method</div>
              <div className="ck-method-grid" style={{ marginBottom: 16 }}>
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    className={`ck-method ${method === m.id ? "on" : ""}`}
                    onClick={() => setMethod(m.id)}
                  >
                    <div className="ck-method-ic">
                      {m.icon === "upi" && <IC.upi />}
                      {m.icon === "card" && <IC.card />}
                      {m.icon === "cash" && <IC.cash />}
                      {m.icon === "split" && <IC.split />}
                    </div>
                    <div className="ck-method-l">{m.label}</div>
                    <div className="ck-method-d">{m.desc}</div>
                  </button>
                ))}
              </div>

              <div className="ck-section-lbl">Amount to collect</div>
              <div className="ck-amt-big">
                <span>₹</span>
                {total.toLocaleString("en-IN")}
              </div>

              {method === "upi" && <UpiPanel total={total} onDone={finishPayment} customerName={baseBooking.customer.name} />}
              {method === "cash" && (
                <CashPanel
                  total={total}
                  onDone={finishPayment}
                  cashReceived={cashReceived}
                  setCashReceived={setCashReceived}
                  changeToReturn={changeToReturn}
                  quickAmounts={quickAmounts}
                />
              )}
              {method === "card" && (
                <CardPanel
                  total={total}
                  onDone={finishPayment}
                  cardWaiting={cardWaiting}
                  setCardWaiting={setCardWaiting}
                />
              )}
              {method === "split" && (
                <div
                  style={{
                    padding: 24,
                    background: "var(--bg-2)",
                    borderRadius: 12,
                    fontSize: 13,
                    color: "var(--ink-3)",
                    textAlign: "center",
                    border: "1px dashed var(--line)",
                  }}
                >
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
          <div className="ck-cta">
            <div className="ck-cta-l">
              <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                TOTAL TO COLLECT
              </span>
              <span className="ck-cta-amt mono">₹{total.toLocaleString("en-IN")}</span>
            </div>
            <button className="btn btn-primary btn-lg" onClick={() => setStage("pay")} disabled={items.length === 0} style={items.length === 0 ? { opacity: 0.5 } : {}}>
              Take payment <span aria-hidden>→</span>
            </button>
          </div>
        )}

        {flash && (
          <div
            style={{
              position: "fixed",
              bottom: 40,
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--ink)",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 10,
              fontSize: 13,
              zIndex: 80,
              boxShadow: "0 12px 24px -10px rgba(0,0,0,0.3)",
            }}
          >
            {flash}
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
    <div className="ck-total-card">
      <div className="ck-total-row">
        <span>Subtotal</span>
        <span className="mono">₹{subtotal.toLocaleString("en-IN")}</span>
      </div>
      {discount > 0 && (
        <div className="ck-total-row" style={{ color: "var(--rose)" }}>
          <span>Discount</span>
          <span className="mono">− ₹{discount.toLocaleString("en-IN")}</span>
        </div>
      )}
      {tip > 0 && (
        <div className="ck-total-row">
          <span>Tip for stylist</span>
          <span className="mono">+ ₹{tip.toLocaleString("en-IN")}</span>
        </div>
      )}
      {roundOffAmt !== 0 && (
        <div className="ck-total-row">
          <span>Round off</span>
          <span className="mono">
            {roundOffAmt > 0 ? "+" : "−"} ₹{Math.abs(roundOffAmt)}
          </span>
        </div>
      )}
      <div className="ck-total-grand">
        <span>Total to collect</span>
        <span className="mono">₹{total.toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}

// ===== PAYMENT FLOW SUB-COMPONENTS =====

interface UpiPanelProps {
  total: number;
  onDone: (p: PaymentInfo) => void;
  customerName: string;
}

function UpiPanel({ total, onDone, customerName }: UpiPanelProps) {
  return (
    <div className="ck-pay-panel">
      <div className="ck-qr-box" style={{ marginBottom: 16 }}>
        <div className="ck-qr" style={{ padding: 4 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=glowsalon@okaxis&pn=Glow%20Salon&am=${total}&cu=INR&tn=Payment%20for%20salon%20services`)}`}
            alt="UPI QR Code"
            style={{ width: "100%", height: "auto", borderRadius: 8, display: "block" }}
          />
        </div>
        <div className="ck-qr-meta">
          <div className="ck-qr-amt" style={{ fontFamily: "var(--font-mono)" }}>₹{total.toLocaleString("en-IN")}</div>
          <div className="ck-qr-vpa mono">glowsalon@okaxis</div>
          <div className="ck-qr-hint">Ask {customerName.split(" ")[0]} to scan with GPay, PhonePe, Paytm or BHIM</div>
        </div>
      </div>
      <div className="ck-upi-apps" style={{ display: "flex", gap: 6 }}>
        <div className="ck-upi-app">GPay</div>
        <div className="ck-upi-app">PhonePe</div>
        <div className="ck-upi-app">Paytm</div>
        <div className="ck-upi-app">BHIM</div>
      </div>
      <button className="btn btn-outline btn-sm" style={{ width: "100%", marginTop: 14, justifyContent: "center" }} onClick={() => navigator.clipboard.writeText("upi://pay?pa=glowsalon@okaxis&am=" + total)}>
        <IC.copy /> Copy UPI payment link
      </button>
      <div className="ck-pay-status" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14 }}>
        <div className="ck-pay-dot"></div>
        Waiting for UPI payment notification…
      </div>
      <button
        className="btn btn-primary btn-lg ck-confirm-btn"
        onClick={() => onDone({ method: "UPI · glowsalon@okaxis", received: total })}
      >
        I've received the payment
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
}

function CashPanel({
  total,
  onDone,
  cashReceived,
  setCashReceived,
  changeToReturn,
  quickAmounts,
}: CashPanelProps) {
  const isShort = cashReceived < total;
  return (
    <div className="ck-pay-panel">
      <div className="ck-cash-amt">
        <label>Cash received</label>
        <div className="ck-cash-input">
          <span>₹</span>
          <input
            type="number"
            value={cashReceived || ""}
            onChange={(e) => setCashReceived(Math.max(0, parseInt(e.target.value) || 0))}
            autoFocus
          />
        </div>
      </div>
      <div className="ck-cash-quick" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        {quickAmounts.map((v) => (
          <button
            key={v}
            className="ck-cash-quick-btn"
            style={{ flex: 1, minWidth: 70 }}
            onClick={() => setCashReceived(v)}
          >
            ₹{v.toLocaleString("en-IN")}
          </button>
        ))}
      </div>
      <div className={`ck-change ${isShort ? "short" : ""}`} style={{ marginTop: 14 }}>
        <div className="ck-change-l">{isShort ? "Short by" : "Change to return"}</div>
        <div className="ck-change-r mono">₹{Math.abs(cashReceived - total).toLocaleString("en-IN")}</div>
      </div>
      <button
        className="btn btn-primary btn-lg ck-confirm-btn"
        disabled={isShort}
        style={isShort ? { opacity: 0.4, cursor: "not-allowed" } : {}}
        onClick={() =>
          onDone({
            method: `Cash · ₹${cashReceived} received, ₹${changeToReturn} change`,
            received: total,
          })
        }
      >
        Mark cash received
      </button>
    </div>
  );
}

interface CardPanelProps {
  total: number;
  onDone: (p: PaymentInfo) => void;
  cardWaiting: boolean;
  setCardWaiting: (val: boolean) => void;
}

function CardPanel({ total, onDone, cardWaiting, setCardWaiting }: CardPanelProps) {
  return (
    <div className="ck-pay-panel" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="ck-card-illu" style={{ marginBottom: 12 }}>
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
      <div className="ck-card-amount" style={{ width: "100%", textAlign: "center", marginBottom: 14 }}>
        <div className="ck-card-amt-lbl">Amount</div>
        <div className="ck-card-amt-v" style={{ fontFamily: "var(--font-mono)" }}>₹{total.toLocaleString("en-IN")}</div>
      </div>
      <div className="ck-pay-status" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div className="ck-pay-dot"></div>
        {cardWaiting ? "Tap, Swipe, or Insert card on the reader…" : "Card detected! Authorizing payment…"}
      </div>
      <button
        className="btn btn-primary btn-lg ck-confirm-btn"
        style={{ width: "100%" }}
        onClick={() => onDone({ method: "Card · **** 4527", received: total })}
      >
        Card payment received
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
    <div className="ck-receipt">
      <div className="ck-receipt-head" style={{ textAlign: "center", padding: "28px 24px" }}>
        <div className="check-wrap" style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
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
        <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
          Payment received
        </h2>
        <p style={{ fontSize: 14, color: "var(--teal-ink)", margin: "6px 0 0" }}>
          ₹{total.toLocaleString("en-IN")} · {payment.method}
        </p>
      </div>

      <div className="ck-receipt-body" style={{ padding: "22px 24px" }}>
        <div className="ck-receipt-section" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="ck-receipt-row">
            <span>Customer</span>
            <strong>{customer.name}</strong>
          </div>
          <div className="ck-receipt-row">
            <span>Date &amp; time</span>
            <strong className="mono">{currentDateStr}</strong>
          </div>
          <div className="ck-receipt-row">
            <span>Receipt ID</span>
            <strong className="mono">RC-2026-05189</strong>
          </div>
        </div>
        <div className="ck-receipt-divider" style={{ height: 1, background: "var(--line)", margin: "16px 0" }}></div>
        <div className="ck-receipt-section" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it) => (
            <div key={it.id} className="ck-receipt-row">
              <span>
                {it.qty} × {it.name}
              </span>
              <strong className="mono">₹{(it.qty * it.price).toLocaleString("en-IN")}</strong>
            </div>
          ))}
          {discount > 0 && (
            <div className="ck-receipt-row" style={{ color: "var(--rose)" }}>
              <span>Discount</span>
              <strong>− ₹{discount.toLocaleString("en-IN")}</strong>
            </div>
          )}
          {tip > 0 && (
            <div className="ck-receipt-row">
              <span>Tip</span>
              <strong>+ ₹{tip.toLocaleString("en-IN")}</strong>
            </div>
          )}
        </div>
        <div className="ck-receipt-divider" style={{ height: 1, background: "var(--line)", margin: "16px 0" }}></div>
        <div className="ck-receipt-row" style={{ fontSize: 18 }}>
          <strong>Total paid</strong>
          <strong style={{ color: "var(--teal)" }} className="mono">
            ₹{total.toLocaleString("en-IN")}
          </strong>
        </div>
      </div>

      <div className="ck-receipt-actions" style={{ padding: "18px 24px 24px" }}>
        <button
          className="btn btn-wa btn-lg"
          style={{ width: "100%", background: "var(--wa)", color: "#fff", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 8 }}
          onClick={onWhatsApp}
        >
          <IC.wa /> Send receipt on WhatsApp
        </button>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={onPrint}>
            <IC.print /> Print
          </button>
          <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
