import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWhatsAppServerConfig } from "@/lib/whatsapp/server-config";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const config = getWhatsAppServerConfig();
  const missing: string[] = [];
  if (!config.metaAppId) missing.push("META_APP_ID");
  if (!config.embeddedSignupConfigId) missing.push("META_EMBEDDED_SIGNUP_CONFIG_ID");
  if (!config.metaAppSecret) missing.push("META_APP_SECRET");
  if (!config.tokenEncryptionKey) missing.push("WHATSAPP_TOKEN_ENCRYPTION_KEY");

  return NextResponse.json({
    ok: true,
    configured: missing.length === 0,
    missing,
    chairbookSenderConfigured: Boolean(config.chairbookAccessToken && config.chairbookPhoneNumberId),
    appId: config.metaAppId || null,
    configId: config.embeddedSignupConfigId || null,
    graphApiVersion: config.graphApiVersion,
  });
}
