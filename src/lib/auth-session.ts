"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase";

const APP_AUTH_CACHE_KEYS = ["cb_profile", "cb_salon_id"];

export function clearLocalAuthCache() {
  if (typeof window === "undefined") return;

  APP_AUTH_CACHE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
}

export async function signOutCurrentUser() {
  clearLocalAuthCache();

  try {
    await fetch("/api/auth/signout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } catch (err) {
    console.warn("Server signout failed; falling back to browser signout.", err);
  }

  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn("Browser signout failed.", error);
    }
  }

  clearLocalAuthCache();
}
