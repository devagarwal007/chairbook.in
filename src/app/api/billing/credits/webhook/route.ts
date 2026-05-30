import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppServerConfig } from "@/lib/whatsapp/server-config";
import { verifyRazorpayWebhookSignature } from "@/lib/whatsapp/razorpay";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
      };
    };
  };
};

export async function POST(request: Request) {
  const admin = getSupabaseAdminClient();
  const config = getWhatsAppServerConfig();

  if (!admin || !config.razorpayWebhookSecret) {
    return NextResponse.json({ error: "Razorpay webhook is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!verifyRazorpayWebhookSignature(rawBody, signature, config.razorpayWebhookSecret)) {
    return NextResponse.json({ error: "Invalid Razorpay signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as RazorpayWebhookPayload;
  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id;
  const paymentId = payment?.id;

  if (!orderId || !paymentId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const { data: topup } = await admin
    .from("message_credit_topups")
    .select("id, salon_id, credits, status")
    .eq("razorpay_order_id", orderId)
    .maybeSingle();

  if (!topup) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (event.event === "payment.captured" && topup.status !== "paid") {
    await admin.from("message_credit_topups").update({
      status: "paid",
      razorpay_payment_id: paymentId,
      paid_at: new Date().toISOString(),
      raw_event: event,
    }).eq("id", topup.id);

    await admin.rpc("apply_message_credit_topup", {
      p_salon_id: topup.salon_id,
      p_topup_id: topup.id,
      p_credits: topup.credits,
      p_idempotency_key: `topup:${paymentId}`,
    });
  }

  if (event.event === "payment.failed") {
    await admin.from("message_credit_topups").update({
      status: "failed",
      razorpay_payment_id: paymentId,
      raw_event: event,
    }).eq("id", topup.id).neq("status", "paid");
  }

  return NextResponse.json({ ok: true });
}
