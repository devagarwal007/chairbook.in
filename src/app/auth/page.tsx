"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient, getSupabaseEnvError } from "@/lib/supabase";

import { Icons } from "@/components/ui/Icons";


interface AuthScreenProps {
  initialMode?: "signin" | "signup";
}

async function getPostLoginPath(supabase: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>, userId: string) {
  const { data: profile, error: profileError } = await supabase.from("users").select("org_id").eq("id", userId).maybeSingle();

  if (profileError) {
    throw profileError;
  }

  return profile?.org_id ? "/dashboard" : "/onboarding";
}

export function AuthScreen({ initialMode = "signup" }: AuthScreenProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [stage, setStage] = useState<"form" | "success">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setIsCheckingSession(false);
      return;
    }

    let mounted = true;

    const redirectIfSignedIn = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted || !session?.user) {
        setIsCheckingSession(false);
        return;
      }

      try {
        router.replace(await getPostLoginPath(supabase, session.user.id));
      } catch (sessionError) {
        setError(sessionError instanceof Error ? sessionError.message : "Could not check your account setup.");
        setIsCheckingSession(false);
      }
    };

    redirectIfSignedIn();

    return () => {
      mounted = false;
    };
  }, [router]);

  const isValidEmail = email.includes("@") && email.includes(".");
  const isValidPassword = password.trim().length >= 6;
  const isValidName = name.trim().length >= 2;

  const isValidForm = mode === "signup" 
    ? isValidEmail && isValidPassword && isValidName 
    : isValidEmail && isValidPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidForm || isSubmitting) {
      return;
    }

    const envError = getSupabaseEnvError();
    if (envError) {
      setError(`${envError} Add these values to .env.local before using live auth.`);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const authResult =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                name: name.trim(),
              },
            },
          });

    if (authResult.error) {
      setError(authResult.error.message);
      setIsSubmitting(false);
      return;
    }

    if (mode === "signin") {
      if (!authResult.data.user) {
        setError("Could not find your signed-in user.");
        setIsSubmitting(false);
        return;
      }

      try {
        const nextPath = await getPostLoginPath(supabase, authResult.data.user.id);
        setIsSubmitting(false);
        router.push(nextPath);
      } catch (profileError) {
        setError(profileError instanceof Error ? profileError.message : "Could not check your account setup.");
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(false);
    setStage("success");
  };

  return (
    <div className="auth-stage">
      <div className="auth-frame">
        {/* Left rail / brand panel */}
        <div className="auth-aside">
          <div className="auth-brand">
            <div className="brand-mark" style={{ width: 40, height: 40, fontSize: 18, borderRadius: 12 }}>C</div>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>ChairBook</span>
          </div>
          <div className="auth-aside-body">
            <div className="auth-aside-quote">
              "The first month we saw 14 customers we hadn't messaged in two months — sent them an offer and 9 came back."
            </div>
            <div className="auth-aside-attr">
              <div className="avatar md tone-b" style={{ border: "2px solid rgba(255,255,255,0.15)", width: "36px", height: "36px", borderRadius: "50%", background: "#0F6E56", display: "grid", placeItems: "center", fontSize: "12px", fontWeight: "bold" }}>RV</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Ravi Varma</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>Owner, Glow Salon · Andheri</div>
              </div>
            </div>
            <div className="auth-aside-stats">
              <div>
                <div className="num">2,400+</div>
                <div className="lbl">salons across India</div>
              </div>
              <div>
                <div className="num">₹8.4Cr</div>
                <div className="lbl">bookings/month</div>
              </div>
            </div>
          </div>
          <div className="auth-aside-foot">
            <span className="mono">v1.4 · made in Bengaluru</span>
          </div>
        </div>

        {/* Form panel */}
        <div className="auth-panel">
          <Link className="auth-home" href="/">
            ← Back to home
          </Link>

          <div className="auth-form">
            {isCheckingSession && (
              <div className="auth-success">
                <div className="auth-eyebrow">
                  <Icons.shield /> Checking session
                </div>
                <h1 className="auth-h1" style={{ textAlign: "center", marginTop: 22 }}>
                  You are already signed in.
                </h1>
                <p className="auth-sub" style={{ textAlign: "center" }}>
                  Taking you to the right place.
                </p>
              </div>
            )}

            {!isCheckingSession && stage === "form" && (
              <form onSubmit={handleSubmit}>
                <div className="auth-eyebrow">
                  <Icons.spark /> {mode === "signin" ? "Welcome back" : "Get started — free for 30 days"}
                </div>
                <h1 className="auth-h1">
                  {mode === "signin" ? "Sign in to ChairBook" : "Create your salon account"}
                </h1>
                <p className="auth-sub">
                  {mode === "signin"
                    ? "Enter your email address and password to continue setup or open your dashboard."
                    : "Create your account, confirm your email, then sign in to set up your salon."}
                </p>

                {error && (
                  <div className="form-alert" role="alert">
                    {error}
                  </div>
                )}

                {mode === "signup" && (
                  <div className="field" style={{ marginTop: 20 }}>
                    <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-3)", display: "block", marginBottom: "6px" }}>Full Name</label>
                    <input
                      style={{ height: "46px", padding: "0 14px", border: "1px solid var(--line-2)", borderRadius: "10px", outline: 0, width: "100%", fontSize: "15px", color: "var(--ink)", fontFamily: "inherit" }}
                      type="text"
                      placeholder="e.g. Ravi Varma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                    />
                  </div>
                )}

                <div className="field" style={{ marginTop: 14 }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-3)", display: "block", marginBottom: "6px" }}>Email Address</label>
                  <input
                    style={{ height: "46px", padding: "0 14px", border: "1px solid var(--line-2)", borderRadius: "10px", outline: 0, width: "100%", fontSize: "15px", color: "var(--ink)", fontFamily: "inherit" }}
                    type="email"
                    placeholder="e.g. ravi@glowsalon.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus={mode === "signin"}
                  />
                </div>

                <div className="field" style={{ marginTop: 14 }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-3)", display: "block", marginBottom: "6px" }}>Password</label>
                  <input
                    style={{ height: "46px", padding: "0 14px", border: "1px solid var(--line-2)", borderRadius: "10px", outline: 0, width: "100%", fontSize: "15px", color: "var(--ink)", fontFamily: "inherit" }}
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg auth-cta"
                  disabled={!isValidForm || isSubmitting}
                  style={!isValidForm || isSubmitting ? { opacity: 0.4 } : {}}
                >
                  {isSubmitting ? "Please wait" : mode === "signin" ? "Sign In" : "Create Account"}{" "}
                  <span aria-hidden style={{ marginLeft: "4px" }}>→</span>
                </button>

                <div className="auth-meta">
                  <span>
                    <Icons.shield /> Bank-grade security
                  </span>
                  <span>
                    <Icons.lock /> Encrypted credentials
                  </span>
                </div>

                <div className="auth-switch">
                  {mode === "signin" ? (
                    <>
                      New to ChairBook?{" "}
                      <a onClick={() => { setMode("signup"); setError(null); }} style={{ color: "var(--teal)", fontWeight: 500, cursor: "pointer" }}>
                        Create an account
                      </a>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <a onClick={() => { setMode("signin"); setError(null); }} style={{ color: "var(--teal)", fontWeight: 500, cursor: "pointer" }}>
                        Sign in
                      </a>
                    </>
                  )}
                </div>
              </form>
            )}

            {!isCheckingSession && stage === "success" && (
              <SuccessStep mode={mode} />
            )}
          </div>

          <div className="auth-tos">
            By continuing you agree to our <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a>.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return <AuthScreen initialMode="signup" />;
}

// Subcomponent: SuccessStep
interface SuccessStepProps {
  mode: "signin" | "signup";
}

function SuccessStep({ mode }: SuccessStepProps) {
  const router = useRouter();

  const handleRedirect = () => {
    if (mode === "signin") {
      router.push("/dashboard");
    } else {
      router.push("/signin");
    }
  };

  return (
    <div className="auth-success">
      <div className="check-wrap">
        <svg width="72" height="72" viewBox="0 0 80 80" style={{ transform: "rotate(-5deg)" }}>
          <circle cx="40" cy="40" r="36" fill="none" stroke="#0F6E56" strokeWidth="2.5" />
          <path d="M22 41 35 54 58 28" fill="none" stroke="#0F6E56" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="auth-h1" style={{ textAlign: "center", marginTop: 22 }}>
        {mode === "signin" ? "Signing you in…" : "Check your email"}
      </h1>
      <p className="auth-sub" style={{ textAlign: "center", marginBottom: 24 }}>
        {mode === "signin"
          ? "Taking you to the right place."
          : "We sent you a confirmation link. After verifying your email, sign in and we will start salon onboarding."}
      </p>
      <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={handleRedirect}>
        {mode === "signin" ? "Continue →" : "Go to sign in →"}
      </button>
    </div>
  );
}
