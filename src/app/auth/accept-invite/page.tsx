"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { getPostLoginPath } from "@/lib/auth-routing";
import { getSupabaseBrowserClient, getSupabaseEnvError } from "@/lib/supabase";

type InviteState = "checking" | "ready" | "invalid" | "saved";

function readHashSession() {
  if (typeof window === "undefined" || !window.location.hash) {
    return null;
  }

  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

export default function AcceptInvitePage() {
  const router = useRouter();
  const [state, setState] = useState<InviteState>("checking");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const syncInviteSession = async () => {
      const envError = getSupabaseEnvError();
      if (envError) {
        setError(envError);
        setState("invalid");
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setError("Supabase is not configured.");
        setState("invalid");
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          setState("invalid");
          return;
        }
        window.history.replaceState({}, document.title, "/auth/accept-invite");
      } else {
        const hashSession = readHashSession();
        if (hashSession) {
          const { error: setSessionError } = await supabase.auth.setSession(hashSession);
          if (setSessionError) {
            setError(setSessionError.message);
            setState("invalid");
            return;
          }
          window.history.replaceState({}, document.title, "/auth/accept-invite");
        }
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("This invite link is expired or has already been used. Ask the salon owner to send a new invite.");
        setState("invalid");
        return;
      }

      setName(typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email?.split("@")[0] || "");
      setEmail(user.email || "");
      setState("ready");
    };

    queueMicrotask(() => {
      syncInviteSession();
    });
  }, []);

  const canSubmit = name.trim().length >= 2 && password.length >= 6 && password === confirmPassword && !isSubmitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { data, error: updateError } = await supabase.auth.updateUser({
      password,
      data: {
        name: name.trim(),
      },
    });

    if (updateError || !data.user) {
      setError(updateError?.message || "Could not save your password.");
      setIsSubmitting(false);
      return;
    }

    await Promise.all([
      supabase.from("users").update({ name: name.trim() }).eq("id", data.user.id),
      supabase
        .from("stylists")
        .update({ name: name.trim(), account_accepted_at: new Date().toISOString() })
        .eq("user_id", data.user.id),
    ]);

    setState("saved");
    const nextPath = await getPostLoginPath(supabase, data.user.id);
    router.replace(nextPath);
  };

  return (
    <div className="auth-stage">
      <div className="auth-frame">
        <div className="auth-aside">
          <div className="auth-brand">
            <div className="brand-mark" style={{ width: 40, height: 40, fontSize: 18, borderRadius: 12 }}>C</div>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>ChairBook</span>
          </div>
          <div className="auth-aside-body">
            <div className="auth-aside-quote">
              {"Your stylist account is private to you. Set a password only you know."}
            </div>
            <div className="auth-aside-stats">
              <div>
                <div className="num">Own</div>
                <div className="lbl">appointments only</div>
              </div>
              <div>
                <div className="num">No</div>
                <div className="lbl">billing access</div>
              </div>
            </div>
          </div>
          <div className="auth-aside-foot">
            <span className="mono">stylist access</span>
          </div>
        </div>

        <div className="auth-panel">
          <Link className="auth-home" href="/signin">
            ← Back to sign in
          </Link>
          <div className="auth-form">
            {state === "checking" && (
              <div className="auth-success">
                <div className="auth-eyebrow">
                  <Icons.shield /> Checking invite
                </div>
                <h1 className="auth-h1" style={{ textAlign: "center", marginTop: 22 }}>Opening your stylist invite.</h1>
                <p className="auth-sub" style={{ textAlign: "center" }}>One moment while we verify this link.</p>
              </div>
            )}

            {state === "invalid" && (
              <div className="auth-success">
                <div className="auth-eyebrow">
                  <Icons.lock /> Invite unavailable
                </div>
                <h1 className="auth-h1" style={{ textAlign: "center", marginTop: 22 }}>This invite cannot be used.</h1>
                <p className="auth-sub" style={{ textAlign: "center" }}>{error}</p>
                <Link href="/signin" className="btn btn-primary btn-lg no-underline" style={{ width: "100%", marginTop: 18 }}>
                  Go to sign in
                </Link>
              </div>
            )}

            {state === "ready" && (
              <form onSubmit={handleSubmit}>
                <div className="auth-eyebrow">
                  <Icons.spark /> Stylist invite
                </div>
                <h1 className="auth-h1">Set your password</h1>
                <p className="auth-sub">
                  Choose your own password for {email || "your stylist account"}. The salon owner will not know it.
                </p>

                {error && <div className="form-alert" role="alert">{error}</div>}

                <div className="field" style={{ marginTop: 20 }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-3)", display: "block", marginBottom: "6px" }}>Your name</label>
                  <input
                    style={{ height: "46px", padding: "0 14px", border: "1px solid var(--line-2)", borderRadius: "10px", outline: 0, width: "100%", fontSize: "15px", color: "var(--ink)", fontFamily: "inherit" }}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoFocus
                  />
                </div>

                <div className="field" style={{ marginTop: 14 }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-3)", display: "block", marginBottom: "6px" }}>New password</label>
                  <input
                    style={{ height: "46px", padding: "0 14px", border: "1px solid var(--line-2)", borderRadius: "10px", outline: 0, width: "100%", fontSize: "15px", color: "var(--ink)", fontFamily: "inherit" }}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 6 characters"
                  />
                </div>

                <div className="field" style={{ marginTop: 14 }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-3)", display: "block", marginBottom: "6px" }}>Confirm password</label>
                  <input
                    style={{ height: "46px", padding: "0 14px", border: "1px solid var(--line-2)", borderRadius: "10px", outline: 0, width: "100%", fontSize: "15px", color: "var(--ink)", fontFamily: "inherit" }}
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat password"
                  />
                </div>

                {password && confirmPassword && password !== confirmPassword && (
                  <div className="form-alert" role="alert" style={{ marginTop: 14 }}>Passwords do not match.</div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg auth-cta"
                  disabled={!canSubmit}
                  style={!canSubmit ? { opacity: 0.4 } : {}}
                >
                  {isSubmitting ? "Saving..." : "Activate stylist account"} <span aria-hidden>→</span>
                </button>
              </form>
            )}

            {state === "saved" && (
              <div className="auth-success">
                <div className="auth-eyebrow">
                  <Icons.check /> Password saved
                </div>
                <h1 className="auth-h1" style={{ textAlign: "center", marginTop: 22 }}>Taking you to your dashboard.</h1>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
