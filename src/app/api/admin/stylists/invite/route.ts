import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function makeError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const admin = getSupabaseAdminClient();

  if (!supabase) {
    return makeError("Supabase is not configured.", 500);
  }

  if (!admin) {
    return makeError("Stylist invites require SUPABASE_SERVICE_ROLE_KEY on the server.", 500);
  }

  const payload = await request.json().catch(() => null);
  const stylistId = typeof payload?.stylistId === "string" ? payload.stylistId : "";
  const email = normalizeEmail(payload?.email);
  const name = normalizeName(payload?.name);

  if (!stylistId) {
    return makeError("Stylist id is required.", 400);
  }

  if (!email || !email.includes("@") || !email.includes(".")) {
    return makeError("A valid stylist email is required.", 400);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return makeError("You must be signed in as a salon owner.", 401);
  }

  const { data: stylist, error: stylistError } = await supabase
    .from("stylists")
    .select("id, salon_id, name, role_label, user_id")
    .eq("id", stylistId)
    .maybeSingle();

  if (stylistError || !stylist) {
    return makeError("Stylist not found or you do not have access.", 404);
  }

  const { data: salon, error: salonError } = await supabase
    .from("salons")
    .select("id, org_id")
    .eq("id", stylist.salon_id)
    .maybeSingle();

  if (salonError || !salon?.org_id) {
    return makeError("Could not verify the stylist salon.", 403);
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", salon.org_id)
    .maybeSingle();

  if (!org) {
    return makeError("Only the salon owner can invite stylist accounts.", 403);
  }

  const displayName = name || stylist.name || email.split("@")[0] || "Stylist";
  const origin = request.headers.get("origin");
  const redirectTo = origin ? `${origin}/auth/accept-invite` : undefined;
  const existingUser = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let invitedUserId = stylist.user_id || existingUser.data?.id || null;
  let inviteAction: "sent" | "resent" | "active" = "sent";
  let acceptedAt: string | null = null;
  let invitedAt: string | null = null;

  if (!invitedUserId) {
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        name: displayName,
        role: "stylist",
      },
      redirectTo,
    });

    if (inviteError || !inviteData.user) {
      return makeError(inviteError?.message || "Could not send stylist invite.", 400);
    }

    invitedUserId = inviteData.user.id;
    invitedAt = new Date().toISOString();
  } else {
    const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(invitedUserId);

    if (authUserError || !authUserData.user) {
      return makeError("Could not verify the linked stylist account.", 400);
    }

    const authEmail = normalizeEmail(authUserData.user.email);
    if (authEmail && authEmail !== email) {
      return makeError("This stylist account is linked to a different email. Edit the stylist email first.", 409);
    }

    acceptedAt = authUserData.user.email_confirmed_at ||
      authUserData.user.confirmed_at ||
      authUserData.user.last_sign_in_at ||
      null;

    if (acceptedAt) {
      inviteAction = "active";
    } else {
      const { error: resendError } = await admin.auth.resend({
        type: "signup",
        email,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });

      if (resendError) {
        return makeError(resendError.message || "Could not resend stylist invite.", 400);
      }

      inviteAction = "resent";
      invitedAt = new Date().toISOString();
    }
  }

  const { error: profileError } = await admin
    .from("users")
    .upsert({
      id: invitedUserId,
      name: displayName,
      email,
      role: "stylist",
      org_id: salon.org_id,
    }, { onConflict: "id" });

  if (profileError) {
    return makeError(profileError.message, 400);
  }

  const stylistUpdate: {
    user_id: string;
    email: string;
    name: string;
    role_label: string;
    account_invited_at?: string | null;
    account_accepted_at?: string | null;
  } = {
    user_id: invitedUserId,
    email,
    name: displayName,
    role_label: stylist.role_label || "Stylist",
  };

  if (invitedAt !== null) {
    stylistUpdate.account_invited_at = invitedAt;
  }

  if (inviteAction !== "active" || acceptedAt !== null) {
    stylistUpdate.account_accepted_at = acceptedAt;
  }

  const { error: linkError } = await admin
    .from("stylists")
    .update(stylistUpdate)
    .eq("id", stylistId);

  if (linkError) {
    return makeError(linkError.message, 400);
  }

  return NextResponse.json({
    ok: true,
    stylistId,
    userId: invitedUserId,
    email,
    action: inviteAction,
    accountInvitedAt: invitedAt,
    accountAcceptedAt: acceptedAt,
    message: inviteAction === "active"
      ? "Stylist account is already active. Ask them to sign in or reset their password."
      : inviteAction === "resent"
        ? "Stylist invite resent"
        : "Stylist invite sent",
  });
}
