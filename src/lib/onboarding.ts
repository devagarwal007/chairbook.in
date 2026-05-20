import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, getSupabaseEnvError } from "./supabase";

export interface StylistInput {
  name: string;
  role: string;
  tone: string;
}

export interface ServiceInput {
  name: string;
  duration: number;
  price: number;
}

export interface OnboardingInput {
  name: string;
  area: string;
  type: string;
  hours: Record<string, { open: boolean; from: string; to: string }>;
  stylists: StylistInput[];
  services: ServiceInput[];
  waNumber: string;
}

export interface SavedOnboarding {
  orgId: string;
  salonId: string;
  slug: string;
}

export function makeSalonSlug(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "salon";
}

function formatIndianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  return digits.startsWith("91") ? `+${digits}` : `+91${digits}`;
}

export async function saveOnboarding(data: OnboardingInput): Promise<SavedOnboarding> {
  const envError = getSupabaseEnvError();
  if (envError) {
    throw new Error(envError);
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Please sign in before finishing onboarding.");
  }

  const slug = makeSalonSlug(data.name);
  const profileName = getUserDisplayName(user);

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: data.name.trim(),
      owner_user_id: user.id,
      plan: "Salon",
    })
    .select("id")
    .single();

  if (orgError) {
    throw orgError;
  }

  const { error: profileError } = await supabase.from("users").upsert({
    id: user.id,
    org_id: org.id,
    name: profileName,
    email: user.email ?? "",
    phone: null,
    role: "owner",
  });

  if (profileError) {
    throw profileError;
  }

  const { data: salon, error: salonError } = await supabase
    .from("salons")
    .insert({
      org_id: org.id,
      name: data.name.trim(),
      slug,
      area: data.area.trim(),
      city: null,
      type: data.type,
      hours: data.hours,
      wa_number: formatIndianPhone(data.waNumber),
      is_primary: true,
    })
    .select("id, slug")
    .single();

  if (salonError) {
    throw salonError;
  }

  if (data.stylists.length > 0) {
    const { error } = await supabase.from("stylists").insert(
      data.stylists.map((stylist) => ({
        salon_id: salon.id,
        name: stylist.name,
        role_label: stylist.role,
        commission_pct: 0,
        tone: `tone-${stylist.tone}`,
        active: true,
      })),
    );

    if (error) {
      throw error;
    }
  }

  if (data.services.length > 0) {
    const { error } = await supabase.from("services").insert(
      data.services.map((service) => ({
        salon_id: salon.id,
        name: service.name,
        category: "General",
        duration_min: service.duration,
        price: service.price,
        active: true,
      })),
    );

    if (error) {
      throw error;
    }
  }

  return {
    orgId: org.id,
    salonId: salon.id,
    slug: salon.slug,
  };
}

function getUserDisplayName(user: User) {
  const metadataName = user.user_metadata?.name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  return user.email?.split("@")[0] ?? "Salon owner";
}
