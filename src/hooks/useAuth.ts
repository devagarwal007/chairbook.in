import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export interface LandingAuthState {
  isChecking: boolean;
  isSignedIn: boolean;
  displayName: string | null;
  nextPath: "/dashboard" | "/onboarding" | "/auth";
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
          .select("name, org_id")
          .eq("id", session.user.id)
          .maybeSingle();

        const name =
          typeof profile?.name === "string" && profile.name.trim()
            ? profile.name.trim()
            : typeof session.user.user_metadata?.name === "string"
              ? session.user.user_metadata.name
              : session.user.email?.split("@")[0] ?? "Owner";

        if (mounted) {
          setAuthState({
            isChecking: false,
            isSignedIn: true,
            displayName: name,
            nextPath: profile?.org_id ? "/dashboard" : "/onboarding",
            nextLabel: profile?.org_id ? "Dashboard" : "Finish setup",
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
