"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

interface LandingAuthState {
  isChecking: boolean;
  isSignedIn: boolean;
  displayName: string | null;
  nextPath: "/dashboard" | "/onboarding" | "/auth";
  nextLabel: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"Today" | "Week" | "Month">("Week");
  const [authState, setAuthState] = useState<LandingAuthState>({
    isChecking: true,
    isSignedIn: false,
    displayName: null,
    nextPath: "/auth",
    nextLabel: "Start free",
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthState((current) => ({ ...current, isChecking: false }));
      return;
    }

    let mounted = true;

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (!session?.user) {
        setAuthState({
          isChecking: false,
          isSignedIn: false,
          displayName: null,
          nextPath: "/auth",
          nextLabel: "Start free",
        });
        return;
      }

      const { data: profile } = await supabase.from("users").select("name, org_id").eq("id", session.user.id).maybeSingle();
      const name =
        typeof profile?.name === "string" && profile.name.trim()
          ? profile.name.trim()
          : typeof session.user.user_metadata?.name === "string"
            ? session.user.user_metadata.name
            : session.user.email?.split("@")[0] ?? "Owner";

      setAuthState({
        isChecking: false,
        isSignedIn: true,
        displayName: name,
        nextPath: profile?.org_id ? "/dashboard" : "/onboarding",
        nextLabel: profile?.org_id ? "Dashboard" : "Finish setup",
      });
    };

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      syncSession();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  
  // Custom heights for the weekly revenue bar chart depending on toggle state
  const chartData = {
    Today: [
      { label: "10 AM", val: "₹1,200", height: "35%" },
      { label: "12 PM", val: "₹2,400", height: "70%" },
      { label: "2 PM", val: "₹1,800", height: "55%" },
      { label: "4 PM", val: "₹3,100", height: "90%" },
      { label: "6 PM", val: "₹2,200", height: "65%" },
      { label: "8 PM", val: "₹3,500", height: "100%", hot: true },
      { label: "10 PM", val: "₹800", height: "25%" }
    ],
    Week: [
      { label: "MON", val: "₹2,800", height: "55%" },
      { label: "TUE", val: "₹1,900", height: "38%" },
      { label: "WED", val: "₹3,600", height: "72%" },
      { label: "THU", val: "₹2,400", height: "48%" },
      { label: "FRI", val: "₹3,200", height: "65%" },
      { label: "SAT", val: "₹5,100", height: "100%", hot: true },
      { label: "SUN", val: "₹4,200", height: "84%" }
    ],
    Month: [
      { label: "W1", val: "₹12.4k", height: "65%" },
      { label: "W2", val: "₹14.8k", height: "80%" },
      { label: "W3", val: "₹18.2k", height: "100%", hot: true },
      { label: "W4", val: "₹15.1k", height: "83%" },
      { label: "W5", val: "₹6.2k", height: "35%" },
      { label: "", val: "", height: "0%" },
      { label: "", val: "", height: "0%" }
    ]
  };

  const currentRevenue = {
    Today: "₹15,000",
    Week: "₹38,420",
    Month: "₹66,700"
  };

  const revenueLabel = {
    Today: "Revenue · today",
    Week: "Revenue · last 7 days",
    Month: "Revenue · last 30 days"
  };

  const changePercent = {
    Today: "↑ 8%",
    Week: "↑ 12%",
    Month: "↑ 15%"
  };

  const topService = {
    Today: "Haircut · ₹4.2k",
    Week: "Hair color · ₹14.2k",
    Month: "Smoothening · ₹24.5k"
  };

  const topStylist = {
    Today: "Anjali · 6 bookings",
    Week: "Anjali · 26 bookings",
    Month: "Anjali · 94 bookings"
  };

  return (
    <>
      {/* NAVIGATION */}
      <nav className="nav">
        <div className="wrap nav-inner">
          <div className="logo">
            <div className="logo-mark">C</div>
            <span>ChairBook</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#whatsapp">WhatsApp Native</a>
            <a href="#pricing">Pricing Plans</a>
            <a href="#stories">Salons Stories</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="nav-cta">
            {authState.isChecking ? (
              <div className="nav-user" aria-label="Checking account session">
                <span className="nav-user-dot"></span>
                <span>Checking session</span>
              </div>
            ) : authState.isSignedIn ? (
              <>
                <div className="nav-user" aria-label="Signed in account">
                  <span className="nav-user-dot"></span>
                  <span>{authState.displayName ? `Signed in as ${authState.displayName}` : "Signed in"}</span>
                </div>
                <a className="btn btn-primary" href={authState.nextPath}>{authState.nextLabel}</a>
              </>
            ) : (
              <>
                <a className="btn btn-ghost" href="/signin">Sign in</a>
                <a className="btn btn-primary" href="/auth">Start free</a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="dot"></span> Built in India for independent salons
            </div>
            <h1 className="display">
              Your salon, <em>fully booked</em> — without the WhatsApp chaos.
            </h1>
            <p className="lede">
              ChairBook turns your WhatsApp into a real booking system. Take appointments, remember every customer, and see exactly where your revenue comes from — from a single phone.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary btn-lg" href={authState.isSignedIn ? authState.nextPath : "/auth"}>
                {authState.isSignedIn ? authState.nextLabel : "Start free for 30 days"} <span aria-hidden="true" style={{ marginLeft: "6px" }}>→</span>
              </a>
              <a className="btn btn-outline btn-lg" href="#features">
                See features
              </a>
            </div>
            <div className="hero-meta">
              <span><span className="check">✓</span> No card required</span>
              <span><span className="check">✓</span> Set up in 10 minutes</span>
              <span><span className="check">✓</span> Hindi &amp; English</span>
            </div>
          </div>

          <div className="hero-visual">
            {/* Phone Screen Mockup */}
            <div className="phone">
              <div className="phone-screen">
                <div className="pscreen-top">
                  <div>
                    <div className="ps-greeting">Sunday, 7:42 AM</div>
                    <div className="ps-name">Good morning, Ravi 👋</div>
                  </div>
                  <div className="ps-avatar">R</div>
                </div>
                <div className="ps-metrics">
                  <div className="ps-metric">
                    <div className="l">Revenue</div>
                    <div className="v teal">₹4,200</div>
                  </div>
                  <div className="ps-metric">
                    <div className="l">Today</div>
                    <div className="v">8</div>
                  </div>
                  <div className="ps-metric">
                    <div className="l">No-show</div>
                    <div className="v">1</div>
                  </div>
                </div>
                <div className="ps-section">
                  <span>Today's schedule</span>
                  <span className="pill">3 confirmed</span>
                </div>
                <div className="ps-appts">
                  <div className="ps-appt">
                    <div className="t">10:00<small>30 min</small></div>
                    <div className="who">Priya Sharma<small>Haircut · Anjali</small></div>
                    <span className="badge confirmed">Confirmed</span>
                  </div>
                  <div className="ps-appt">
                    <div className="t">10:45<small>45 min</small></div>
                    <div className="who">Meera Iyer<small>Color · Anjali</small></div>
                    <span className="badge arrived">Arrived</span>
                  </div>
                  <div className="ps-appt">
                    <div className="t">11:30<small>60 min</small></div>
                    <div className="who">Kavya Reddy<small>Facial · Pooja</small></div>
                    <span className="badge completed">Done</span>
                  </div>
                  <div className="ps-appt">
                    <div className="t">12:30<small>30 min</small></div>
                    <div className="who">Sneha P.<small>Threading · Pooja</small></div>
                    <span className="badge confirmed">Confirmed</span>
                  </div>
                </div>
                <div className="fab">+</div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="float f1">
              <div className="row">
                <div className="ico wa">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.6-.9-2.2-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.2 3.2.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.3c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
                  </svg>
                </div>
                <div>
                  <div className="ttl">New booking</div>
                  <div className="sub">Anita V. — Hair Spa, Friday 4:00 PM</div>
                </div>
              </div>
            </div>

            <div className="float f2">
              <div className="row">
                <div className="ico am">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 21h20L12 2zm0 6l6.5 11h-13L12 8zm-1 3v4h2v-4h-2zm0 5v2h2v-2h-2z"/>
                  </svg>
                </div>
                <div>
                  <div className="ttl">3 customers cooling off</div>
                  <div className="sub">Send a re-engagement message →</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* LOGOS STRIP */}
      <div className="wrap logos">
        <div className="logos-cap">Trusted by salons in</div>
        <div className="logos-row">
          <span className="logo-ghost">Mumbai</span>
          <span className="logo-ghost">Bengaluru</span>
          <span className="logo-ghost">Hyderabad</span>
          <span className="logo-ghost">Pune</span>
          <span className="logo-ghost">Delhi NCR</span>
          <span className="logo-ghost">Chennai</span>
        </div>
      </div>

      {/* PROBLEM SECTION */}
      <section className="block" id="problem">
        <div className="wrap">
          <div className="sec-head">
            <span className="sec-eyebrow">// The problem</span>
            <h2 className="sec-title">Most salons run on guesswork, sticky notes, and a thousand WhatsApp messages.</h2>
            <p className="sec-sub">
              Stylists forget who's coming. Customers ghost. The diary is in three places. You can't tell if Tuesday was actually a good day. We've spoken to 200+ owners — here's what we heard.
            </p>
          </div>

          <div className="problem-grid">
            <div className="p-card">
              <div className="num">01 / Bookings</div>
              <h3>Double-booked. Again.</h3>
              <p>One stylist, two appointments, one angry customer in the waiting area scrolling their phone.</p>
              <div className="strike">
                <s>Paper diary</s><span className="arrow">→</span><strong>Real-time calendar</strong>
              </div>
            </div>
            <div className="p-card">
              <div className="num">02 / Customers</div>
              <h3>You know the face, not the spend.</h3>
              <p>Regulars feel anonymous. You can't remember what Priya got last time, let alone her preferred stylist.</p>
              <div className="strike">
                <s>Memory</s><span className="arrow">→</span><strong>Customer profiles</strong>
              </div>
            </div>
            <div className="p-card">
              <div className="num">03 / Revenue</div>
              <h3>You feel busy, but where's the money?</h3>
              <p>Cash flows in and out. Some weeks are great, some empty — and you have no idea why.</p>
              <div className="strike">
                <s>Gut feel</s><span className="arrow">→</span><strong>Daily dashboard</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="block" id="features">
        <div className="wrap">
          <div className="sec-head">
            <span className="sec-eyebrow">// What's inside</span>
            <h2 className="sec-title">Three tools, one app, zero learning curve.</h2>
            <p className="sec-sub">
              Built around the way Indian salons already work — WhatsApp first, cash and UPI, walk-ins and regulars all in the same chair.
            </p>
          </div>

          {/* Feature 1: Booking Link */}
          <div className="feature">
            <div className="f-copy">
              <div className="num">01 — Bookings</div>
              <h2>Share a link. Get the booking.</h2>
              <p className="lede2">
                Every salon gets a clean booking page at <span className="mono" style={{ color: "var(--teal)", fontWeight: 500 }}>chairbook.in/yours</span>. Drop it in your WhatsApp status, Instagram bio, or a customer's chat — they pick a service, stylist, and slot in under a minute.
              </p>
              <ul className="f-bullets">
                <li>
                  <span className="b">✓</span>
                  <div>
                    Live availability across stylists, no double-booking{" "}
                    <small>— synced to your phone the moment you tap "accept"</small>
                  </div>
                </li>
                <li>
                  <span className="b">✓</span>
                  <div>Auto-reminder on WhatsApp 24 hours before the appointment</div>
                </li>
                <li>
                  <span className="b">✓</span>
                  <div>Walk-ins added in two taps from the dashboard</div>
                </li>
              </ul>
            </div>
            <div className="f-visual">
              <div className="label">// Booking flow</div>
              <div className="wa-mock">
                <div className="wa-bubble out">
                  Hi Priya 🙏 You can book your next appointment here:
                  <div className="preview">
                    <div className="t">Glow Salon &amp; Spa, Andheri</div>
                    <div className="u">chairbook.in/glow-andheri</div>
                  </div>
                  <small>9:42 AM ✓✓</small>
                </div>
                <div className="wa-bubble in">
                  Done! Booked for Saturday at 4 PM with Anjali ✨
                  <small>9:48 AM</small>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2: CRM */}
          <div className="feature flip">
            <div className="f-visual">
              <div className="label">// Customer list</div>
              <div className="crm-mock">
                <div className="crm-search">🔍 Search customers…</div>
                <div className="crm-row">
                  <div className="crm-av">PS</div>
                  <div>
                    <div className="crm-name"><span className="status-dot sd-green"></span>Priya Sharma</div>
                    <div className="crm-meta">12 visits · Last seen 6 days ago</div>
                  </div>
                  <div className="crm-spend">₹12,400<small>Lifetime</small></div>
                </div>
                <div className="crm-row">
                  <div className="crm-av">MI</div>
                  <div>
                    <div className="crm-name"><span className="status-dot sd-amber"></span>Meera Iyer</div>
                    <div className="crm-meta">5 visits · Last seen 42 days ago</div>
                  </div>
                  <div className="crm-spend">₹6,800<small>Lifetime</small></div>
                </div>
                <div className="crm-row">
                  <div className="crm-av">KR</div>
                  <div>
                    <div className="crm-name"><span className="status-dot sd-red"></span>Kavya Reddy</div>
                    <div className="crm-meta">8 visits · Last seen 81 days ago</div>
                  </div>
                  <div className="crm-spend">₹9,200<small>Lifetime</small></div>
                </div>
                <div className="crm-row">
                  <div className="crm-av">SP</div>
                  <div>
                    <div className="crm-name"><span className="status-dot sd-green"></span>Sneha P.</div>
                    <div className="crm-meta">3 visits · Last seen 2 days ago</div>
                  </div>
                  <div className="crm-spend">₹2,150<small>Lifetime</small></div>
                </div>
              </div>
            </div>
            <div className="f-copy">
              <div className="num">02 — Customers</div>
              <h2>Every regular, remembered.</h2>
              <p className="lede2">
                A real CRM for your salon. See who's a regular, who's cooling off, and who's about to leave you for the place down the street — and win them back with one tap.
              </p>
              <ul className="f-bullets">
                <li>
                  <span className="b">✓</span>
                  <div>Profile per customer with service history, preferred stylist, notes</div>
                </li>
                <li>
                  <span className="b">✓</span>
                  <div>Color-coded engagement status: active, cooling, lost</div>
                </li>
                <li>
                  <span className="b">✓</span>
                  <div>One-tap re-engagement WhatsApp with a personalized offer</div>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 3: Interactive Analytics */}
          <div className="feature">
            <div className="f-copy">
              <div className="num">03 — Insights</div>
              <h2>Know which day, service and stylist actually makes you money.</h2>
              <p className="lede2">
                Most salon apps stop at calendars. We give you the same revenue clarity a premium cafe founder has — without making you read a complex spreadsheet. Try toggling the periods below.
              </p>
              <ul className="f-bullets">
                <li>
                  <span className="b">✓</span>
                  <div>Revenue analytics by day, week, month with delta comparisons</div>
                </li>
                <li>
                  <span className="b">✓</span>
                  <div>Top services and stylists ranked by revenue generated</div>
                </li>
                <li>
                  <span className="b">✓</span>
                  <div>Interactive dashboard designed specifically for phones</div>
                </li>
              </ul>
            </div>
            <div className="f-visual">
              <div className="label">// Interactive Insights Demo</div>
              <div className="an-mock">
                <div className="an-toggle">
                  <span 
                    className={activeTab === "Today" ? "on" : ""} 
                    onClick={() => setActiveTab("Today")}
                  >
                    Today
                  </span>
                  <span 
                    className={activeTab === "Week" ? "on" : ""} 
                    onClick={() => setActiveTab("Week")}
                  >
                    Week
                  </span>
                  <span 
                    className={activeTab === "Month" ? "on" : ""} 
                    onClick={() => setActiveTab("Month")}
                  >
                    Month
                  </span>
                </div>
                <div>
                  <div className="an-num">
                    {currentRevenue[activeTab]}{" "}
                    <small className="up">{changePercent[activeTab]}</small>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--ink-3)", marginTop: "4px" }}>
                    {revenueLabel[activeTab]}
                  </div>
                </div>
                <div>
                  <div className="an-bars">
                    {chartData[activeTab].map((bar, i) => (
                      <div 
                        key={i}
                        className={`bar ${bar.hot ? "hot" : ""}`} 
                        style={{ height: bar.height }}
                        title={bar.val}
                      />
                    ))}
                  </div>
                  <div className="an-bars" style={{ height: "auto", marginTop: "4px" }}>
                    {chartData[activeTab].map((bar, i) => (
                      <div 
                        key={i} 
                        className="lbl" 
                        style={bar.hot ? { color: "var(--teal)", fontWeight: 600 } : {}}
                      >
                        {bar.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="an-row" style={{ fontSize: "11px", color: "var(--ink-3)", paddingTop: "8px", borderTop: "1px solid var(--line)" }}>
                  <div className="col">
                    Top service<br />
                    <strong style={{ color: "var(--ink)", fontWeight: 600, fontSize: "13px" }}>
                      {topService[activeTab]}
                    </strong>
                  </div>
                  <div className="col">
                    Top stylist<br />
                    <strong style={{ color: "var(--ink)", fontWeight: 600, fontSize: "13px" }}>
                      {topStylist[activeTab]}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHATSAPP STRIP */}
      <section id="whatsapp">
        <div className="wrap">
          <div className="wa-strip">
            <div>
              <span className="wa-pill"><span className="d"></span> Native WhatsApp integration</span>
              <h2>Your customers already use WhatsApp. We meet them there.</h2>
              <p>
                Bookings, confirmations, reminders, re-engagement — all delivered through the green app your customers already check 40 times a day. No new app to download. No SMS that gets ignored.
              </p>
              <div className="ctas">
                <a className="btn btn-wa btn-lg" href="#features">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: "6px" }}>
                    <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.6-.9-2.2-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.2 3.2.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.3c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
                  </svg>
                  See live booking demo
                </a>
                <a className="btn btn-dark btn-lg" href="#features">How it works →</a>
              </div>
            </div>
            <div className="wa-thread">
              <div className="ts">Today</div>
              <div className="b out">Hi Priya 🙏 This is a reminder: Haircut with Anjali tomorrow at 4 PM.</div>
              <div className="b out">Reply <strong>YES</strong> to confirm or <strong>RESCHEDULE</strong> to pick a new slot.</div>
              <div className="b in">YES ✅</div>
              <div className="b out">See you tomorrow! 🙌</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING PLANS */}
      <section className="block" id="pricing">
        <div className="wrap">
          <div className="sec-head" style={{ textAlign: "center", margin: "0 auto 56px" }}>
            <span className="sec-eyebrow">// Pricing</span>
            <h2 className="sec-title">Honest pricing. No per-booking fee. Ever.</h2>
            <p className="sec-sub" style={{ margin: "0 auto" }}>
              First 30 days are free, no card needed. Pay monthly, cancel anytime.
            </p>
          </div>

          <div className="price-grid">
            <div className="pcard">
              <div className="ptitle">Solo</div>
              <div className="psub">For independent stylists</div>
              <div className="price"><span className="v">₹499</span><span className="per">/ month</span></div>
              <div className="gst">+ GST · Billed monthly</div>
              <ul>
                <li><span className="b">✓</span> 1 stylist · 1 calendar</li>
                <li><span className="b">✓</span> Bookings via WhatsApp link</li>
                <li><span className="b">✓</span> Up to 200 customers</li>
                <li><span className="b">✓</span> Basic insights dashboard</li>
              </ul>
              <a className="btn btn-outline" href={authState.isSignedIn ? authState.nextPath : "/auth"}>{authState.isSignedIn ? authState.nextLabel : "Start free"}</a>
            </div>

            <div className="pcard featured">
              <div className="ptitle">Salon</div>
              <div className="psub">Most independent salons start here</div>
              <div className="price"><span className="v">₹999</span><span className="per">/ month</span></div>
              <div className="gst">+ GST · Billed monthly</div>
              <ul>
                <li><span className="b">✓</span> Up to 5 stylists / branches</li>
                <li><span className="b">✓</span> WhatsApp reminders &amp; re-engagement</li>
                <li><span className="b">✓</span> Unlimited customers, full CRM</li>
                <li><span className="b">✓</span> Revenue, services &amp; stylist analytics</li>
                <li><span className="b">✓</span> Daily WhatsApp morning summary</li>
              </ul>
              <a className="btn btn-primary" href={authState.isSignedIn ? authState.nextPath : "/auth"}>{authState.isSignedIn ? authState.nextLabel : "Start free"}</a>
            </div>

            <div className="pcard">
              <div className="ptitle">Chain</div>
              <div className="psub">2+ branches</div>
              <div className="price"><span className="v">₹2,499</span><span className="per">/ month</span></div>
              <div className="gst">+ GST · Billed monthly</div>
              <ul>
                <li><span className="b">✓</span> Multi-branch dashboard &amp; salons</li>
                <li><span className="b">✓</span> Roles &amp; advanced permissions</li>
                <li><span className="b">✓</span> Custom stylist commission plans</li>
                <li><span className="b">✓</span> Priority WhatsApp support</li>
              </ul>
              <a className="btn btn-outline" href="mailto:hello@chairbook.in">Talk to us</a>
            </div>
          </div>
        </div>
      </section>

      {/* STORIES SECTION */}
      <section className="block" id="stories">
        <div className="wrap">
          <div className="sec-head">
            <span className="sec-eyebrow">// Stories</span>
            <h2 className="sec-title">From the diary to the dashboard.</h2>
            <p className="sec-sub">Salon owners who run their day from one screen.</p>
          </div>

          <div className="testi-grid">
            <div className="testi">
              <div className="badge-loc">→ ANDHERI, MUMBAI · 3 stylists</div>
              <p className="q">
                "The first month we saw 14 customers we hadn't messaged in two months — sent them an offer and 9 came back. That alone paid for the year."
              </p>
              <div className="who">
                <div className="av">RV</div>
                <div>
                  <div className="n">Ravi Varma</div>
                  <div className="r">Owner, Glow Salon</div>
                </div>
              </div>
            </div>
            <div className="testi">
              <div className="badge-loc">→ KORAMANGALA, BENGALURU · 2 stylists</div>
              <p className="q">
                "I used to fight with my staff over the physical diary. Now bookings just come in on WhatsApp. My Saturdays are full and I haven't double-booked once in 4 months."
              </p>
              <div className="who">
                <div className="av">AS</div>
                <div>
                  <div className="n">Anita Sharma</div>
                  <div className="r">Owner, Anita's Studio</div>
                </div>
              </div>
            </div>
            <div className="testi">
              <div className="badge-loc">→ JUBILEE HILLS, HYDERABAD · 5 stylists</div>
              <p className="q">
                "I finally know that Saturdays bring in 38% of the week and color services are 40% of revenue. We rearranged staff around it. Up ₹40k in two months."
              </p>
              <div className="who">
                <div className="av">SK</div>
                <div>
                  <div className="n">Suresh K.</div>
                  <div className="r">Owner, Bloom &amp; Brow</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="block" id="faq">
        <div className="wrap faq-grid">
          <div>
            <span className="sec-eyebrow">// FAQ</span>
            <h2 className="sec-title" style={{ fontSize: "32px" }}>Questions, answered.</h2>
            <p className="sec-sub" style={{ fontSize: "15px" }}>
              Still curious? WhatsApp us at{" "}
              <span className="mono" style={{ color: "var(--teal)", fontWeight: 500 }}>
                +91 80000 12345
              </span>{" "}
              — usually we reply in under an hour.
            </p>
          </div>
          <div className="faq-list">
            <details className="faq-item" open>
              <summary className="faq-q">Do my customers need to download an app? <span className="ic">+</span></summary>
              <div className="faq-a">
                No. Your customers only need WhatsApp. They tap your booking link, pick a slot, and they're done. You're the only one who needs ChairBook.
              </div>
            </details>
            <details className="faq-item">
              <summary className="faq-q">What if my staff don't speak English? <span className="ic">+</span></summary>
              <div className="faq-a">
                The owner app and customer booking page are available in English and Hindi today, with Tamil, Telugu and Marathi shipping this quarter.
              </div>
            </details>
            <details className="faq-item">
              <summary className="faq-q">Will it work on my old phone? <span className="ic">+</span></summary>
              <div className="faq-a">
                ChairBook is built mobile-first and fully optimized for entry-level Android devices with 2 GB RAM and slow 4G internet.
              </div>
            </details>
            <details className="faq-item">
              <summary className="faq-q">Can I cancel anytime? <span className="ic">+</span></summary>
              <div className="faq-a">
                Yes. No lock-in contracts, no hidden cancel fees. You can export your full customer data at any time.
              </div>
            </details>
            <details className="faq-item">
              <summary className="faq-q">Is my customer data safe? <span className="ic">+</span></summary>
              <div className="faq-a">
                All data is encrypted in transit and at rest, hosted securely in India, and never shared. We are DPDP compliant.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <div className="wrap">
          <h2>Stop running your salon from a <em>WhatsApp inbox</em>.</h2>
          <p>30 days free. Set up in 10 minutes. No card. No catch.</p>
          <div className="ctas">
            <a className="btn btn-primary btn-lg" href={authState.isSignedIn ? authState.nextPath : "/auth"}>
              {authState.isSignedIn ? authState.nextLabel : "Start free for 30 days"} <span aria-hidden="true" style={{ marginLeft: "6px" }}>→</span>
            </a>
            <a className="btn btn-outline btn-lg" href="#features">
              Book a 15-min walkthrough
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div className="foot-brand">
              <div className="logo">
                <div className="logo-mark">C</div>
                <span>ChairBook</span>
              </div>
              <p>Bookings, customers and insights for independent Indian salons. Made in Bengaluru.</p>
            </div>
            <div className="foot-col">
              <h4>Product</h4>
              <a href="#features">Bookings Link</a>
              <a href="#features">Customer CRM</a>
              <a href="#features">Insights Dashboard</a>
              <a href="#whatsapp">WhatsApp Alerts</a>
            </div>
            <div className="foot-col">
              <h4>Company</h4>
              <a href="#">About Us</a>
              <a href="#stories">Customer Stories</a>
              <a href="#pricing">Pricing Plans</a>
              <a href="mailto:hello@chairbook.in">Contact</a>
            </div>
            <div className="foot-col">
              <h4>Support</h4>
              <a href="#">Help Centre</a>
              <a href="https://wa.me/918000012345" target="_blank">WhatsApp Support</a>
              <a href="#">Terms of Service</a>
              <a href="#">Privacy Policy</a>
            </div>
          </div>
          <div className="foot-bot">
            <div>© 2026 ChairBook Technologies Pvt. Ltd.</div>
            <div className="mny">v1.4 · made for ₹</div>
          </div>
        </div>
      </footer>
    </>
  );
}
