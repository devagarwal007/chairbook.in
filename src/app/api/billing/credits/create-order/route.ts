import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppCreditPack } from "@/lib/whatsapp/credit-packs";
import { getWhatsAppServerConfig } from "@/lib/whatsapp/server-config";

type CreateOrderPayload = {
  salonId?: string;
  packId?: string;
};

function makeError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  const config = getWhatsAppServerConfig();

  if (!supabase || !admin) return makeError("Supabase is not configured.", 500);
  if (!config.razorpayKeyId || !config.razorpayKeySecret) {
    return makeError("Razorpay credit refills are not configured.", 503);
  }

  const payload = await request.json().catch(() => null) as CreateOrderPayload | null;
  const pack = payload?.packId ? getWhatsAppCreditPack(payload.packId) : null;
  if (!payload?.salonId || !pack) {
    return makeError("Salon and credit pack are required.", 400);
  }

  const { data: salon } = await supabase
    .from("salons")
    .select("id")
    .eq("id", payload.salonId)
    .maybeSingle();
  if (!salon) return makeError("Salon not found or not allowed.", 403);

  const receipt = `wa_${payload.salonId.slice(0, 8)}_${Date.now()}`;
  const credentials = Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString("base64");
  const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: pack.amountPaise,
      currency: "INR",
      receipt,
      notes: {
        salon_id: payload.salonId,
        pack_id: pack.id,
        credits: String(pack.credits),
      },
    }),
  });

  const order = await razorpayResponse.json().catch(() => null);
  if (!razorpayResponse.ok || typeof order?.id !== "string") {
    return makeError("Could not create Razorpay refill order.", 400);
  }

  await admin.from("message_credit_topups").insert({
    salon_id: payload.salonId,
    razorpay_order_id: order.id,
    amount_paise: pack.amountPaise,
    credits: pack.credits,
    status: "created",
    raw_event: { receipt, packId: pack.id },
  });

  return NextResponse.json({
    ok: true,
    keyId: config.razorpayKeyId,
    orderId: order.id,
    amountPaise: pack.amountPaise,
    credits: pack.credits,
    currency: "INR",
  });
}
