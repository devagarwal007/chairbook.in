"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabaseBrowserClient, getSupabaseEnvError } from "@/lib/supabase";

type Step = 1 | 2 | 3 | 4;

import { Salon, Service, Stylist, BookingRow } from "@/types";

interface BookingState {
  salon: Salon | null;
  services: Service[];
  stylists: Stylist[];
  bookings: BookingRow[];
}

const I = {
  pin: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  star: () => (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
      <path d="m12 2 3 7 7 .6-5.3 4.7L18.5 22 12 18 5.5 22l1.8-7.7L2 9.6 9 9z" />
    </svg>
  ),
  back: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  check: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  clock: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  wa: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.6-.9-2.2-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.2 3.2.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.3c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
    </svg>
  ),
};

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("91") ? `+${digits}` : `+91${digits}`;
}

function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toMinutes(time: string) {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function toTime(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

function getDates() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);

    return {
      key: toLocalDateKey(date),
      dow: date.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase(),
      dom: date.getDate(),
      label: index === 0 ? "Today" : index === 1 ? "Tomorrow" : "",
      full: date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
      dayKey: DAY_KEYS[date.getDay()],
    };
  });
}

function getSlotsForDate(salon: Salon | null, dateKey: string, dates: ReturnType<typeof getDates>, duration: number) {
  const date = dates.find((d) => d.key === dateKey);
  const hours = date && salon?.hours?.[date.dayKey];
  const from = hours?.from || "10:00";
  const to = hours?.to || "20:00";

  if (hours && !hours.open) {
    return [];
  }

  const now = new Date();
  const isToday = dateKey === toLocalDateKey(now);
  const start = toMinutes(from);
  const end = toMinutes(to);
  const firstAvailable = isToday ? now.getHours() * 60 + now.getMinutes() + 45 : start;

  const slots = [];
  for (let mins = start; mins + duration <= end; mins += 30) {
    if (mins >= firstAvailable) {
      slots.push(toTime(mins));
    }
  }

  return slots;
}

function overlaps(slot: string, duration: number, booking: BookingRow) {
  const slotStart = toMinutes(slot);
  const slotEnd = slotStart + duration;
  const bookingStart = toMinutes(booking.start_time);
  const bookingEnd = bookingStart + booking.duration;

  return slotStart < bookingEnd && slotEnd > bookingStart;
}

function getAvailableStylistId(stylists: Stylist[], bookings: BookingRow[], date: string, time: string, duration: number, selected: string | number) {
  const activeBookings = bookings.filter((booking) => booking.date === date && !["Cancelled", "No-show"].includes(booking.status));

  if (selected !== "any") {
    return activeBookings.some((booking) => booking.stylist_id === selected && overlaps(time, duration, booking)) ? null : selected;
  }

  return stylists.find((stylist) => !activeBookings.some((booking) => booking.stylist_id === stylist.id && overlaps(time, duration, booking)))?.id ?? null;
}

function StepBar({ step }: { step: Step }) {
  const steps = ["Service", "When & who", "Your details"];

  return (
    <div className="step-bar">
      {steps.map((label, index) => {
        const n = index + 1;
        const done = step > n;
        const active = step === n;

        return (
          <React.Fragment key={label}>
            <div className={`step ${active ? "active" : ""} ${done ? "done" : ""}`}>
              <div className="step-num">{done ? <I.check /> : n}</div>
              <div className="step-lbl">{label}</div>
            </div>
            {index < steps.length - 1 && <div className={`step-line ${done ? "done" : ""}`}></div>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function PublicBookingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const dates = useMemo(() => getDates(), []);

  const [state, setState] = useState<BookingState>({ salon: null, services: [], stylists: [], bookings: [] });
  const [step, setStep] = useState<Step>(1);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedStylist, setSelectedStylist] = useState<string | number>("any");
  const [selectedDate, setSelectedDate] = useState(dates[1]?.key ?? dates[0].key);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalDuration = selectedServices.reduce((sum, service) => sum + (service.duration_min || service.duration), 0);
  const totalPrice = selectedServices.reduce((sum, service) => sum + Number(service.price), 0);

  useEffect(() => {
    const loadSalon = async () => {
      const envError = getSupabaseEnvError();
      if (envError) {
        setMessage(envError);
        setIsLoading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setMessage("Supabase is not configured.");
        setIsLoading(false);
        return;
      }

      const { data: salon, error: salonError } = await supabase.from("salons").select("*").eq("slug", slug).single();
      if (salonError || !salon) {
        setMessage("We could not find this salon booking page.");
        setIsLoading(false);
        return;
      }

      const endDate = dates[dates.length - 1].key;
      const [{ data: services, error: serviceError }, { data: stylists, error: stylistError }, { data: bookings, error: bookingError }] =
        await Promise.all([
          supabase.from("services").select("id,name,category,duration_min,price").eq("salon_id", salon.id).eq("active", true).order("category").order("name"),
          supabase.from("stylists").select("id,name,role_label,tone").eq("salon_id", salon.id).eq("active", true).order("name"),
          supabase.from("bookings").select("id,stylist_id,date,start_time,duration,status").eq("salon_id", salon.id).gte("date", dates[0].key).lte("date", endDate),
        ]);

      const error = serviceError || stylistError || bookingError;
      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      setState({
        salon,
        services: (services ?? []).map((s: any) => ({
          ...s,
          duration: s.duration_min,
        })),
        stylists: stylists ?? [],
        bookings: bookings ?? [],
      });
      setIsLoading(false);
    };

    loadSalon();
  }, [dates, slug]);

  const groupedServices = useMemo(() => {
    return state.services.reduce<Record<string, Service[]>>((groups, service) => {
      const category = service.category || "General";
      groups[category] = [...(groups[category] ?? []), service];
      return groups;
    }, {});
  }, [state.services]);

  const slots = useMemo(() => {
    if (!totalDuration) {
      return [];
    }

    return getSlotsForDate(state.salon, selectedDate, dates, totalDuration).map((time) => ({
      time,
      available: !!getAvailableStylistId(state.stylists, state.bookings, selectedDate, time, totalDuration, selectedStylist),
    }));
  }, [dates, selectedDate, selectedStylist, state.bookings, state.salon, state.stylists, totalDuration]);

  const selectedDateLabel = dates.find((date) => date.key === selectedDate);
  const selectedStylistName = selectedStylist === "any" ? "First available" : state.stylists.find((stylist) => stylist.id === selectedStylist)?.name ?? "Stylist";
  const canAdvance = (step === 1 && selectedServices.length > 0) || (step === 2 && selectedTime) || (step === 3 && customerName.trim().length > 1 && phone.replace(/\D/g, "").length >= 10);

  const toggleService = (service: Service) => {
    setSelectedServices((current) => (current.some((item) => item.id === service.id) ? current.filter((item) => item.id !== service.id) : [...current, service]));
  };

  const submitBooking = async () => {
    if (!state.salon || !selectedTime || isSubmitting) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    const stylistId = getAvailableStylistId(state.stylists, state.bookings, selectedDate, selectedTime, totalDuration, selectedStylist);
    if (!stylistId) {
      setMessage("That slot just got booked. Please pick another time.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const { data: bookingRows, error: bookingError } = await supabase.rpc("create_public_booking", {
      p_salon_id: state.salon.id,
      p_customer_name: customerName.trim(),
      p_phone: formatPhone(phone),
      p_stylist_id: stylistId,
      p_date: selectedDate,
      p_start_time: selectedTime,
      p_duration: totalDuration,
      p_service_ids: selectedServices.map((service) => service.id),
    });

    const booking = Array.isArray(bookingRows) ? bookingRows[0] : null;

    if (bookingError || !booking) {
      setMessage(bookingError?.message ?? "Could not create booking.");
      setIsSubmitting(false);
      return;
    }

    setState((current) => ({
      ...current,
      bookings: [
        ...current.bookings,
        {
          id: booking.booking_id,
          stylist_id: stylistId,
          date: selectedDate,
          start_time: selectedTime,
          duration: totalDuration,
          status: "Confirmed",
        },
      ],
    }));
    setStep(4);
    setIsSubmitting(false);
  };

  const reset = () => {
    setSelectedServices([]);
    setSelectedStylist("any");
    setSelectedDate(dates[1]?.key ?? dates[0].key);
    setSelectedTime(null);
    setCustomerName("");
    setPhone("");
    setMessage(null);
    setStep(1);
  };

  const advance = () => {
    if (!canAdvance) {
      return;
    }

    if (step === 3) {
      submitBooking();
      return;
    }

    setStep((current) => (current + 1) as Step);
  };

  return (
    <div className="book-stage device-phone">
      <div className="book-frame">
        {step < 4 && (
          <header className="book-top">
            {step > 1 ? (
              <button className="book-back" onClick={() => setStep((step - 1) as Step)} aria-label="Back">
                <I.back />
              </button>
            ) : (
              <div className="salon-logo">
                <div className="salon-logo-mark">{state.salon?.name?.[0] ?? "C"}</div>
              </div>
            )}
            <div className="salon-block">
              <div className="salon-name">{state.salon?.name ?? "ChairBook"}</div>
              <div className="salon-meta">
                <I.pin /> {state.salon?.area || state.salon?.city || "Public booking"}
              </div>
            </div>
            <div className="rating-chip">
              <I.star />
              <span>4.8</span>
            </div>
          </header>
        )}

        {step < 4 && <StepBar step={step} />}

        <div className="book-body">
          {isLoading && (
            <div className="step-content animate-fade-in">
              {/* Header skeleton */}
              <div className="salon-header" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div className="pulse" style={{ width: 44, height: 44, borderRadius: 12 }} />
                <div style={{ flex: 1 }}>
                  <div className="pulse" style={{ width: 120, height: 18, borderRadius: 4 }} />
                  <div className="pulse" style={{ width: 160, height: 12, borderRadius: 4, marginTop: 6 }} />
                </div>
              </div>

              {/* Title skeleton */}
              <div className="pulse" style={{ width: 220, height: 24, borderRadius: 4, marginBottom: 8 }} />
              <div className="pulse" style={{ width: 300, height: 14, borderRadius: 4, marginBottom: 24 }} />

              {/* Category skeleton */}
              <div className="svc-cat">
                <div className="pulse" style={{ width: 80, height: 16, borderRadius: 4, marginBottom: 12 }} />
                <div className="svc-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="svc-card pulse" style={{ height: 68, borderRadius: "var(--radius)" }}>
                      <div className="svc-info">
                        <div style={{ width: 100, height: 16, borderRadius: 4 }} />
                        <div style={{ width: 60, height: 12, borderRadius: 4, marginTop: 6 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isLoading && message && step !== 3 && <div className="book-empty">{message}</div>}

          {!isLoading && state.salon && step === 1 && (
            <div className="step-content">
              <h1 className="step-title">What can we do for you?</h1>
              <p className="step-sub">Choose one or more services from {state.salon.name}.</p>

              {Object.entries(groupedServices).map(([category, services]) => (
                <div key={category} className="svc-cat">
                  <div className="svc-cat-name">{category}</div>
                  <div className="svc-list">
                    {services.map((service) => {
                      const selected = selectedServices.some((item) => item.id === service.id);
                      return (
                        <button key={service.id} className={`svc-card ${selected ? "on" : ""}`} onClick={() => toggleService(service)}>
                          <div className="svc-info">
                            <div className="svc-name">{service.name}</div>
                            <div className="svc-meta">
                              <I.clock /> {service.duration_min || service.duration} min
                            </div>
                          </div>
                          <div className="svc-price">
                            <div className="svc-price-v">₹{Number(service.price).toLocaleString("en-IN")}</div>
                            <div className={`svc-check ${selected ? "on" : ""}`}>{selected && <I.check />}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && state.salon && step === 2 && (
            <div className="step-content">
              <h1 className="step-title">When would you like to come in?</h1>
              <p className="step-sub">
                {selectedServices.length} service{selectedServices.length === 1 ? "" : "s"} · {totalDuration} min total · ₹{totalPrice.toLocaleString("en-IN")}
              </p>

              <div className="block-label">Choose a stylist</div>
              <div className="stylist-row">
                <button className={`stylist-card ${selectedStylist === "any" ? "on" : ""}`} onClick={() => { setSelectedStylist("any"); setSelectedTime(null); }}>
                  <div className="avatar lg tone-a">?</div>
                  <div className="stylist-name">No preference</div>
                  <div className="stylist-tag">First available</div>
                </button>
                {state.stylists.map((stylist) => (
                  <button key={stylist.id} className={`stylist-card ${selectedStylist === stylist.id ? "on" : ""}`} onClick={() => { setSelectedStylist(stylist.id); setSelectedTime(null); }}>
                    <div className={`avatar lg ${stylist.tone ?? "tone-b"}`}>{stylist.name[0]}</div>
                    <div className="stylist-name">{stylist.name}</div>
                    <div className="stylist-tag">{stylist.role_label || "Stylist"}</div>
                  </button>
                ))}
              </div>

              <div className="block-label">Pick a date</div>
              <div className="date-row">
                {dates.map((date) => (
                  <button key={date.key} className={`date-pill ${selectedDate === date.key ? "on" : ""}`} onClick={() => { setSelectedDate(date.key); setSelectedTime(null); }}>
                    <span className="date-dow">{date.dow}</span>
                    <span className="date-dom">{date.dom}</span>
                    {date.label && <span className="date-lbl">{date.label}</span>}
                  </button>
                ))}
              </div>

              <div className="block-label">
                Available times
                <span className="block-meta">{slots.filter((slot) => slot.available).length} open</span>
              </div>
              <div className="time-grid">
                {slots.map((slot) => (
                  <button key={slot.time} disabled={!slot.available} className={`time-pill ${selectedTime === slot.time ? "on" : ""} ${slot.available ? "" : "taken"}`} onClick={() => setSelectedTime(slot.time)}>
                    {slot.time}
                  </button>
                ))}
                {slots.length === 0 && <div className="book-empty compact">No slots open on this day.</div>}
              </div>
            </div>
          )}

          {!isLoading && state.salon && step === 3 && (
            <div className="step-content">
              <h1 className="step-title">Just one last thing.</h1>
              <p className="step-sub">We will send your confirmation and reminder on WhatsApp.</p>

              <div className="summary">
                <div className="sum-svc-head">
                  <span className="sum-svc-label">Services ({selectedServices.length})</span>
                  <button className="sum-edit" onClick={() => setStep(1)}>Edit</button>
                </div>
                {selectedServices.map((service) => (
                  <div key={service.id} className="sum-svc-row">
                    <div>
                      <div className="sum-svc-name">{service.name}</div>
                      <div className="sum-svc-meta">{service.duration_min || service.duration} min</div>
                    </div>
                    <div className="sum-svc-price">₹{Number(service.price).toLocaleString("en-IN")}</div>
                  </div>
                ))}
                <div className="sum-divider"></div>
                <div className="sum-row"><span>Stylist</span><strong>{selectedStylistName}</strong></div>
                <div className="sum-row"><span>When</span><strong>{selectedDateLabel?.full} · {selectedTime}</strong></div>
                <div className="sum-row total"><span>Total</span><strong>₹{totalPrice.toLocaleString("en-IN")}</strong></div>
              </div>

              {message && <div className="form-alert" style={{ marginTop: 16 }}>{message}</div>}

              <div className="field" style={{ marginTop: 20 }}>
                <label>Your name</label>
                <input placeholder="e.g. Priya Sharma" value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoFocus />
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <label>Phone number</label>
                <div className="phone-input">
                  <span className="phone-prefix">+91</span>
                  <input type="tel" placeholder="98xxx xxxxx" value={phone} onChange={(event) => setPhone(event.target.value.replace(/[^\d ]/g, ""))} maxLength={11} />
                </div>
              </div>

              <div className="trust">
                <I.wa />
                <div>You will get a WhatsApp confirmation after booking. We will only use this number for appointment updates.</div>
              </div>
            </div>
          )}

          {step === 4 && state.salon && (
            <div className="step-content confirm-screen">
              <div className="check-wrap">
                <svg width="80" height="80" viewBox="0 0 80 80" className="check-anim">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="#0F6E56" strokeWidth="2.5" className="check-circle" />
                  <path d="M22 41 35 54 58 28" fill="none" stroke="#0F6E56" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="check-tick" />
                </svg>
              </div>
              <h1 className="step-title" style={{ textAlign: "center", marginTop: 24 }}>You are booked, {customerName.split(" ")[0]}.</h1>
              <p className="step-sub" style={{ textAlign: "center" }}>We have blocked your slot. See you soon.</p>

              <div className="confirm-card">
                <div className="confirm-row">
                  <div className="confirm-lbl">SERVICES ({selectedServices.length})</div>
                  {selectedServices.map((service) => (
                    <div key={service.id} className="confirm-svc">
                      <span>{service.name}</span>
                      <span className="mono" style={{ color: "var(--ink-3)", fontSize: 12 }}>₹{Number(service.price).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
                <div className="confirm-divider"></div>
                <div className="confirm-row">
                  <div className="confirm-lbl">WHEN</div>
                  <div className="confirm-val">{selectedDateLabel?.full}</div>
                  <div className="confirm-meta">{selectedTime} · with {selectedStylistName} · {totalDuration} min</div>
                </div>
                <div className="confirm-divider"></div>
                <div className="confirm-row">
                  <div className="confirm-lbl">WHERE</div>
                  <div className="confirm-val">{state.salon.name}</div>
                  <div className="confirm-meta">{state.salon.area || state.salon.city || "Salon location"}</div>
                </div>
              </div>

              <div className="wa-note">
                <I.wa />
                <div>
                  <strong>WhatsApp confirmation is queued</strong>
                  <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>Automated delivery will be connected in the WhatsApp phase.</div>
                </div>
              </div>

              <button className="btn btn-outline btn-lg" style={{ width: "100%", marginTop: 16 }} onClick={reset}>
                Book another appointment
              </button>
            </div>
          )}
        </div>

        {step < 4 && (
          <div className="book-cta">
            <button className="btn btn-primary btn-lg" disabled={!canAdvance || isSubmitting} style={!canAdvance || isSubmitting ? { opacity: 0.4, cursor: "not-allowed" } : {}} onClick={advance}>
              {step === 3 ? `${isSubmitting ? "Confirming" : "Confirm booking"} · ₹${totalPrice.toLocaleString("en-IN")}` : step === 1 ? `Continue · ${selectedServices.length || "select"} service${selectedServices.length === 1 ? "" : "s"}` : selectedTime ? "Continue" : "Pick a time"}
              {canAdvance && !isSubmitting && <span aria-hidden>→</span>}
            </button>
            <div className="cta-fine">By booking, you agree to the salon cancellation policy.</div>
          </div>
        )}
      </div>
    </div>
  );
}
