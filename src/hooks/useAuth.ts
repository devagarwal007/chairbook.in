import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { getPostLoginPath } from "@/lib/auth-routing";

export interface LandingAuthState {
  isChecking: boolean;
  isSignedIn: boolean;
  displayName: string | null;
  nextPath: "/dashboard" | "/onboarding" | "/stylist" | "/auth" | "/signin";
  nextLabel: string;
}

export function useAuthState() {
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
      queueMicrotask(() => {
        setAuthState((current) => ({ ...current, isChecking: false }));
      });
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

      try {
        const { data: profile } = await supabase
          .from("users")
          .select("name, org_id, role")
          .eq("id", session.user.id)
          .maybeSingle();

        const name =
          typeof profile?.name === "string" && profile.name.trim()
            ? profile.name.trim()
            : typeof session.user.user_metadata?.name === "string"
              ? session.user.user_metadata.name
              : session.user.email?.split("@")[0] ?? "Owner";

        if (mounted) {
          const nextPath = await getPostLoginPath(supabase, session.user.id);
          setAuthState({
            isChecking: false,
            isSignedIn: true,
            displayName: name,
            nextPath,
            nextLabel: nextPath === "/stylist" ? "Stylist dashboard" : nextPath === "/dashboard" ? "Dashboard" : nextPath === "/onboarding" ? "Finish setup" : "Sign in",
          });
        }
      } catch (err) {
        console.error("Error in useAuthState syncSession profile query:", err);
        if (mounted) {
          setAuthState((current) => ({ ...current, isChecking: false }));
        }
      }
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

  return authState;
}
