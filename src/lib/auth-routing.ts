import type { SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "owner" | "manager" | "stylist";
export type AppDestination = "/dashboard" | "/onboarding" | "/stylist" | "/signin";

export interface RoleProfile {
  role: AppRole;
  org_id: string | null;
}

export interface StylistAccountLink {
  id: string;
  active: boolean;
}

export async function getRoleProfile(supabase: SupabaseClient, userId: string): Promise<RoleProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("role, org_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const role = data.role === "stylist" || data.role === "manager" ? data.role : "owner";
  return {
    role,
    org_id: data.org_id ?? null,
  };
}

export async function getLinkedStylistAccount(supabase: SupabaseClient, userId: string): Promise<StylistAccountLink | null> {
  const { data, error } = await supabase
    .from("stylists")
    .select("id, active")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    active: data.active !== false,
  };
}

export async function getPostLoginPath(supabase: SupabaseClient, userId: string): Promise<AppDestination> {
  const profile = await getRoleProfile(supabase, userId);

  if (!profile) {
    return "/signin";
  }

  if (profile.role === "stylist") {
    const linkedStylist = await getLinkedStylistAccount(supabase, userId);
    return linkedStylist?.active ? "/stylist" : "/signin";
  }

  return profile.org_id ? "/dashboard" : "/onboarding";
}
