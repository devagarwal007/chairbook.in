"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { GST_SCHEMA_MISSING_MESSAGE, getSupabaseErrorMessage, isMissingGstSchemaError } from "@/lib/supabase-errors";
import { signOutCurrentUser } from "@/lib/auth-session";
import { isUUID } from "@/lib/utils";
import { findDuplicateServiceCode, findNextServiceCode, formatServiceCode } from "@/lib/service-codes";
import Header from "@/components/layout/Header";
import { Icons as I, Modal, FormField, Avatar, Badge, PhoneInput } from "@/components/ui";
import { useProfile } from "@/context/ProfileContext";
import { useToast } from "@/context/ToastContext";
import { useBillingInvoices, useGstInvoices } from "@/hooks";

import { Service, ServiceKind, Stylist, SettingsData, WhatsAppTemplates, WhatsAppSenderPreference, DbSalon, DbServiceRow, DbStylistRow, SalonGstSettings, DEFAULT_GST_SETTINGS } from "@/types";

import { DAYS, TABS, PLANS, INITIAL_DATA } from "@/constants/settings";
import { validateGstin, INDIAN_STATE_OPTIONS } from "@/lib/gst";
import { MAX_BOOKING_WINDOW_DAYS, MIN_BOOKING_WINDOW_DAYS, normalizeBookingWindowDays } from "@/lib/booking-window";
import { WHATSAPP_CREDIT_PACKS } from "@/lib/whatsapp/credit-packs";
import { buildBookingConfirmationPayload } from "@/lib/whatsapp/message-payloads";
import { sendWhatsAppTemplateFromClient } from "@/lib/whatsapp-client";
import { buildWalletSummary, type MessageCreditWalletRow } from "@/lib/whatsapp/wallet-view";
import {
  extractEmbeddedSignupCode,
  parseEmbeddedSignupMessage,
  type EmbeddedSignupInfo,
} from "@/lib/whatsapp/embedded-signup";

const ServiceMenuModal = dynamic(() => import("@/components/features/settings/ServiceMenuModal"), {
  loading: () => null,
});
const AttendanceSettingsForm = dynamic(() => import("@/components/features/attendance/AttendanceSettingsForm"), {
  loading: () => <div className="animate-pulse bg-bg-2 rounded-xl h-[200px]" />,
});
const BillingInvoiceHistory = dynamic(
  () => import("@/components/features/invoices/InvoiceHistory").then(m => ({ default: m.BillingInvoiceHistory })),
  { loading: () => <div className="animate-pulse bg-bg-2 rounded-xl h-[200px]" /> }
);
const GstInvoiceHistory = dynamic(
  () => import("@/components/features/invoices/InvoiceHistory").then(m => ({ default: m.GstInvoiceHistory })),
  { loading: () => <div className="animate-pulse bg-bg-2 rounded-xl h-[200px]" /> }
);

// ===== SHARED HELPER COMPONENTS =====
interface SectionHeadProps {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}

function SectionHead({ title, desc, action }: SectionHeadProps) {
  return (
    <div className="flex justify-between items-end gap-4 mb-1.5">
      <div>
        <h2 className="text-sm font-semibold tracking-[0.04em] uppercase text-ink-3 m-0">{title}</h2>
        {desc && <p className="text-xs text-ink-3 mt-1">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

interface RowFieldProps {
  label: string;
  value: string;
  hint?: string;
  action?: React.ReactNode;
}

function RowField({ label, value, hint, action }: RowFieldProps) {
  return (
    <div className="flex justify-between items-center py-3.5 border-b border-line first:pt-0 last:border-b-0 last:pb-0">
      <div>
        <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3">{label}</div>
        <div className="text-sm font-medium mt-1">{value}</div>
        {hint && <div className="text-xs text-ink-3 mt-0.5">{hint}</div>}
      </div>
      {action || <button className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>Edit</button>}
    </div>
  );
}

type ServiceModalState = {
  mode: "add" | "edit";
  target?: Service | null;
  startKind?: ServiceKind;
};

type WhatsAppChannelView = {
  id: string;
  mode: "salon_owned" | "chairbook_fallback";
  status: "pending" | "active" | "inactive" | "error";
  credit_line_status: "pending" | "active" | "missing" | "error";
  webhook_status: "unknown" | "subscribed" | "error";
  phone_number_id: string | null;
  display_number: string | null;
  updated_at: string | null;
};

type MessageCreditTopupView = {
  id: string;
  razorpay_order_id: string | null;
  credits: number;
  amount_paise: number;
  status: "created" | "paid" | "failed";
  created_at: string | null;
};

type MessageCreditLedgerView = {
  id: string;
  action: "reserve" | "consume" | "release" | "topup" | "monthly_grant";
  plan_credits: number;
  refill_credits: number;
  created_at: string | null;
};

type WhatsAppTemplateView = {
  id: string;
  template_key: string;
  template_name: string;
  category: string;
  language_code: string;
  status: string;
};

type RazorpayCheckoutInstance = { open: () => void };
type RazorpayCheckoutConstructor = new (options: Record<string, unknown>) => RazorpayCheckoutInstance;
type FacebookSdk = {
  init: (options: Record<string, unknown>) => void;
  login: (callback: (response: unknown) => void, options: Record<string, unknown>) => void;
};
type FacebookWindow = Window & {
  FB?: FacebookSdk;
  fbAsyncInit?: () => void;
};

type WhatsAppConnectConfig = {
  loading: boolean;
  configured: boolean;
  chairbookSenderConfigured: boolean;
  missing: string[];
  appId: string | null;
  configId: string | null;
  graphApiVersion: string;
};

type PendingEmbeddedSignup = {
  code?: string;
  info?: EmbeddedSignupInfo;
  saving?: boolean;
};

function normalizeWhatsAppSenderPreference(value: unknown): WhatsAppSenderPreference {
  return value === "salon_owned" ? "salon_owned" : "chairbook";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readWhatsAppSenderPreference(settings: unknown): WhatsAppSenderPreference {
  return isRecord(settings) ? normalizeWhatsAppSenderPreference(settings.senderPreference) : "chairbook";
}

function withWhatsAppSenderPreference(settings: unknown, preference: WhatsAppSenderPreference) {
  return {
    ...(isRecord(settings) ? settings : {}),
    senderPreference: preference,
  };
}

function buildWhatsAppSettingsPayload(wa: SettingsData["wa"]) {
  return {
    reminder: wa.reminder,
    autoConfirm: wa.autoConfirm,
    sendOffers: false,
    verified: wa.verified ?? true,
    senderPreference: normalizeWhatsAppSenderPreference(wa.senderPreference),
    templates: wa.templates,
  };
}

function loadFacebookSdk(appId: string, graphApiVersion: string): Promise<FacebookSdk> {
  const facebookWindow = window as FacebookWindow;
  if (facebookWindow.FB) {
    facebookWindow.FB.init({
      appId,
      autoLogAppEvents: true,
      xfbml: false,
      version: graphApiVersion,
    });
    return Promise.resolve(facebookWindow.FB);
  }

  return new Promise((resolve, reject) => {
    facebookWindow.fbAsyncInit = () => {
      if (!facebookWindow.FB) {
        reject(new Error("Meta SDK did not initialize."));
        return;
      }
      facebookWindow.FB.init({
        appId,
        autoLogAppEvents: true,
        xfbml: false,
        version: graphApiVersion,
      });
      resolve(facebookWindow.FB);
    };

    if (document.getElementById("facebook-jssdk")) {
      const startedAt = Date.now();
      const poll = window.setInterval(() => {
        if (facebookWindow.FB) {
          window.clearInterval(poll);
          facebookWindow.fbAsyncInit?.();
        } else if (Date.now() - startedAt > 10000) {
          window.clearInterval(poll);
          reject(new Error("Meta SDK did not load."));
        }
      }, 100);
      return;
    }
    const firstScript = document.getElementsByTagName("script")[0];
    const sdkScript = document.createElement("script");
    sdkScript.id = "facebook-jssdk";
    sdkScript.async = true;
    sdkScript.defer = true;
    sdkScript.crossOrigin = "anonymous";
    sdkScript.src = "https://connect.facebook.net/en_US/sdk.js";
    sdkScript.onerror = () => reject(new Error("Could not load Meta SDK."));
    firstScript.parentNode?.insertBefore(sdkScript, firstScript);
  });
}

function loadRazorpayCheckout(): Promise<RazorpayCheckoutConstructor> {
  return new Promise((resolve, reject) => {
    const existing = (window as Window & { Razorpay?: RazorpayCheckoutConstructor }).Razorpay;
    if (existing) {
      resolve(existing);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      const loaded = (window as Window & { Razorpay?: RazorpayCheckoutConstructor }).Razorpay;
      if (loaded) resolve(loaded);
      else reject(new Error("Razorpay checkout did not load."));
    };
    script.onerror = () => reject(new Error("Razorpay checkout did not load."));
    document.body.appendChild(script);
  });
}

const SERVICE_CATEGORIES = ["Hair", "Skin", "Hands", "Nails", "General"];
const SERVICE_SELECT_WITH_BUNDLES = `
  id,
  name,
  category,
  duration_min,
  price,
  active,
  code,
  kind,
  bundle_note,
  bundle_components!bundle_components_bundle_service_id_fkey (
    position,
    component_service_id,
    component:services!bundle_components_component_service_id_fkey (
      id,
      name,
      category,
      duration_min,
      price,
      code,
      active
    )
  )
`;

const inr = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const getServiceKind = (service: Service): ServiceKind => service.kind || "service";
const getComponentIds = (service: Service) => service.componentIds || service.items || [];

function mapDbServiceRow(row: DbServiceRow): Service {
  const kind = row.kind || "service";
  const components = (row.bundle_components || [])
    .slice()
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
  const includedServices = components.flatMap((item) => {
    const component = item.component;
    if (!component) return [];
    return [{
      id: component.id,
      name: component.name,
      cat: component.category || "General",
      category: component.category || "General",
      duration: Number(component.duration_min || 0),
      duration_min: Number(component.duration_min || 0),
      price: Number(component.price || 0),
      code: component.code ?? null,
      kind: "service" as const,
      active: component.active !== false,
    }];
  });

  return {
    id: row.id,
    name: row.name,
    cat: row.category || (kind === "bundle" ? "Combos" : "General"),
    category: row.category || (kind === "bundle" ? "Combos" : "General"),
    duration: row.duration_min,
    duration_min: row.duration_min,
    price: Number(row.price),
    active: row.active,
    code: row.code ?? null,
    kind,
    bundle_note: row.bundle_note || "",
    componentIds: components
      .map((item) => item.component_service_id || item.component?.id)
      .filter((id): id is string | number => Boolean(id)),
    includedServices,
  };
}

// ===== MAIN PAGE COMPONENT =====
export default function SettingsPage() {
  const router = useRouter();
  const { updateProfileInContext } = useProfile();
  const [activeTab, setActiveTab] = useState("salon");
  const [data, setData] = useState<SettingsData>(INITIAL_DATA);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const { show: showFlash } = useToast();
  const [loading, setLoading] = useState(true);

  // Supabase states
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [supabaseSalonId, setSupabaseSalonId] = useState<string | null>(null);
  const [supabaseOrgId, setSupabaseOrgId] = useState<string | null>(null);
  const [gstSchemaAvailable, setGstSchemaAvailable] = useState(true);
  const billingInvoiceList = useBillingInvoices(Boolean(supabaseOrgId));
  const gstInvoiceList = useGstInvoices(Boolean(supabaseSalonId));

  // Service menu state
  const [serviceModal, setServiceModal] = useState<ServiceModalState | null>(null);
  const [serviceSearch, setServiceSearch] = useState("");

  // Stylist Modals state
  const [showStylistModal, setShowStylistModal] = useState(false);
  const [editingStylist, setEditingStylist] = useState<Stylist | null>(null);
  const [stylistName, setStylistName] = useState("");
  const [stylistRole, setStylistRole] = useState("Stylist");
  const [stylistCommission, setStylistCommission] = useState(40);
  const [stylistEmail, setStylistEmail] = useState("");
  const [invitingStylistId, setInvitingStylistId] = useState<string | number | null>(null);

  // WhatsApp Change Number modal
  const [showWaModal, setShowWaModal] = useState(false);
  const [waNumberInput, setWaNumberInput] = useState("");

  // Edit Message Template modal
  const [editingTemplateKey, setEditingTemplateKey] = useState<keyof WhatsAppTemplates | null>(null);
  const [templateText, setTemplateText] = useState("");

  // Dynamic billing and Delete Modal state
  const [whatsappChannels, setWhatsappChannels] = useState<WhatsAppChannelView[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplateView[]>([]);
  const [messageWallet, setMessageWallet] = useState<MessageCreditWalletRow | null>(null);
  const [creditTopups, setCreditTopups] = useState<MessageCreditTopupView[]>([]);
  const [creditLedger, setCreditLedger] = useState<MessageCreditLedgerView[]>([]);
  const [creditRefilling, setCreditRefilling] = useState<string | null>(null);
  const [waTestPhone, setWaTestPhone] = useState("");
  const [waTestSending, setWaTestSending] = useState(false);
  const [waConnectConfig, setWaConnectConfig] = useState<WhatsAppConnectConfig>({
    loading: true,
    configured: false,
    chairbookSenderConfigured: false,
    missing: [],
    appId: null,
    configId: null,
    graphApiVersion: "v24.0",
  });
  const [waConnectBusy, setWaConnectBusy] = useState(false);
  const [waConnectStatus, setWaConnectStatus] = useState<string | null>(null);
  const [waSenderSaving, setWaSenderSaving] = useState(false);
  const [showWaSenderSwitchModal, setShowWaSenderSwitchModal] = useState(false);
  const pendingEmbeddedSignup = useRef<PendingEmbeddedSignup>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      queueMicrotask(() => {
        setLoading(false);
      });
      return;
    }

    const loadSettings = async () => {
      try {
        setLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setLoading(false);
          return;
        }

        setSupabaseUserId(session.user.id);

        const { data: userProfile } = await supabase
          .from("users")
          .select("name, email, role, phone, org_id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!userProfile) {
          setLoading(false);
          return;
        }

        setSupabaseOrgId(userProfile.org_id);

        const userName = userProfile.name || session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Owner";
        const userEmail = userProfile.email || session.user.email || "";
        let userPhone = userProfile.phone || "";
        const cleaned = userPhone.replace(/\s+/g, "");
        if (cleaned === "+91" || cleaned === "91" || cleaned === "+") {
          userPhone = "";
        } else if (cleaned.startsWith("+91")) {
          userPhone = cleaned.slice(3);
        } else if (cleaned.startsWith("91") && cleaned.length > 10) {
          userPhone = cleaned.slice(2);
        } else {
          userPhone = userPhone.trim();
        }

        let salonName = "ChairBook";
        let salonArea = "";
        let salonCity = "";
        let salonType = "Unisex salon";
        const salonHours = INITIAL_DATA.hours;
        let salonWa = INITIAL_DATA.wa.number;
        let orgPlan = INITIAL_DATA.plan;
        let salonTimezone = "Asia/Kolkata";
        let salonCurrency = "INR";
        let salonLanguage = "en";
        let salonBookingWindowDays = INITIAL_DATA.salon.bookingWindowDays;
        let salonIsActive = true;
        let salonPhotos: string[] = [];
        let salonWaSettings = INITIAL_DATA.wa;
        let salonNotifSettings = INITIAL_DATA.notifs;
        let selectedSalon: DbSalon | null = null;

        if (userProfile.org_id) {
          // Load plan from organizations
          const { data: org } = await supabase
            .from("organizations")
            .select("plan")
            .eq("id", userProfile.org_id)
            .maybeSingle();
          if (org?.plan) orgPlan = org.plan.toLowerCase();

          const { data: salon } = await supabase
            .from("salons")
            .select("id, name, area, city, type, hours, wa_number, timezone, currency, language, booking_window_days, wa_settings, notification_settings, is_active, photos")
            .eq("org_id", userProfile.org_id)
            .eq("is_primary", true)
            .maybeSingle();

          selectedSalon = salon as unknown as DbSalon | null;
          if (!selectedSalon) {
            const { data: firstSalon } = await supabase
              .from("salons")
              .select("id, name, area, city, type, hours, wa_number, timezone, currency, language, booking_window_days, wa_settings, notification_settings, is_active, photos")
              .eq("org_id", userProfile.org_id)
              .limit(1)
              .maybeSingle();
            selectedSalon = firstSalon as unknown as DbSalon | null;
          }

          if (selectedSalon) {
            setSupabaseSalonId(selectedSalon.id);
            salonName = selectedSalon.name;
            salonArea = selectedSalon.area || "";
            salonCity = selectedSalon.city || "";
            salonType = selectedSalon.type || "Unisex salon";
            const rawWa = selectedSalon.wa_number || "";
            const cleaned = rawWa.replace(/\s+/g, "");
            if (cleaned.startsWith("+91")) {
              salonWa = cleaned.slice(3);
            } else if (cleaned.startsWith("91") && cleaned.length > 10) {
              salonWa = cleaned.slice(2);
            } else {
              salonWa = rawWa;
            }
            salonTimezone = selectedSalon.timezone || "Asia/Kolkata";
            salonCurrency = selectedSalon.currency || "INR";
            salonLanguage = selectedSalon.language || "en";
            salonBookingWindowDays = normalizeBookingWindowDays(selectedSalon.booking_window_days);
            salonIsActive = selectedSalon.is_active !== false;
            salonPhotos = selectedSalon.photos || [];
            if (selectedSalon.wa_settings) {
              salonWaSettings = {
                ...INITIAL_DATA.wa,
                ...selectedSalon.wa_settings,
                senderPreference: readWhatsAppSenderPreference(selectedSalon.wa_settings),
                templates: {
                  ...INITIAL_DATA.wa.templates,
                  ...(selectedSalon.wa_settings.templates || {})
                }
              };
            }
            if (selectedSalon.notification_settings) {
              salonNotifSettings = {
                ...INITIAL_DATA.notifs,
                ...selectedSalon.notification_settings
              };
            }
          }
        }

        const currentSalonId = selectedSalon?.id;

        // Load services and team from DB. Empty DB means empty UI, never demo rows.
        let dbServices: Service[] = [];
        let dbTeam: Stylist[] = [];

        if (currentSalonId) {
          try {
            const { data: svcData, error: svcError } = await supabase
              .from("services")
              .select(SERVICE_SELECT_WITH_BUNDLES)
              .eq("salon_id", currentSalonId)
              .is("deleted_at", null);
            if (svcError) throw svcError;

            dbServices = ((svcData || []) as unknown as DbServiceRow[]).map(mapDbServiceRow);

            const { data: teamData, error: teamError } = await supabase
              .from("stylists")
              .select("id, name, role_label, tone, commission_pct, active, email, user_id, specialisations, photo_url, booking_slug, account_invited_at, account_accepted_at")
              .eq("salon_id", currentSalonId);
            if (teamError) throw teamError;

            dbTeam = ((teamData || []) as unknown as DbStylistRow[]).map((s) => ({
                id: s.id,
                name: s.name,
                role: s.role_label || "Stylist",
                tone: (s.tone || "tone-a").replace("tone-", ""),
                commission: Number(s.commission_pct || 0),
                email: s.email || null,
                user_id: s.user_id || null,
                specialisations: s.specialisations || [],
                photo_url: s.photo_url || null,
                booking_slug: s.booking_slug || null,
                account_invited_at: s.account_invited_at || null,
                account_accepted_at: s.account_accepted_at || null,
              }));
          } catch (err) {
            console.error("Error loading services/team:", err);
          }
        }

        // Load GST Settings
        let dbGst: SalonGstSettings | undefined = undefined;
        if (currentSalonId) {
          try {
            const { data: gstData, error: gstError } = await supabase
              .from("salon_gst_settings")
              .select("*")
              .eq("salon_id", currentSalonId)
              .maybeSingle();

            if (gstError) throw gstError;
            setGstSchemaAvailable(true);

            if (gstData) {
              dbGst = {
                id: gstData.id,
                salon_id: gstData.salon_id,
                gst_enabled: gstData.gst_enabled,
                gstin: gstData.gstin || "",
                legal_name: gstData.legal_name || "",
                registered_address: gstData.registered_address || "",
                state: gstData.state || "",
                state_code: gstData.state_code || "",
                gst_rate: Number(gstData.gst_rate),
                sac_code: gstData.sac_code || "999721",
                pricing_mode: gstData.pricing_mode || "tax_exclusive",
                invoice_prefix: gstData.invoice_prefix || "SAL",
              };
            }
          } catch (err) {
            if (isMissingGstSchemaError(err)) {
              setGstSchemaAvailable(false);
            } else {
              console.error("Error loading GST settings:", getSupabaseErrorMessage(err));
            }
          }
        }

        if (currentSalonId) {
          try {
            const [
              { data: channelData, error: channelError },
              { data: walletData, error: walletError },
              { data: topupData, error: topupError },
              { data: ledgerData, error: ledgerError },
              { data: templateData, error: templateError },
            ] = await Promise.all([
              supabase
                .from("whatsapp_channels")
                .select("id,mode,status,credit_line_status,webhook_status,phone_number_id,display_number,updated_at")
                .eq("salon_id", currentSalonId)
                .order("mode", { ascending: false }),
              supabase
                .from("message_credit_wallets")
                .select("plan_credits,refill_credits,reserved_plan_credits,reserved_refill_credits,reset_period_start,reset_period_end")
                .eq("salon_id", currentSalonId)
                .maybeSingle(),
              supabase
                .from("message_credit_topups")
                .select("id,razorpay_order_id,credits,amount_paise,status,created_at")
                .eq("salon_id", currentSalonId)
                .order("created_at", { ascending: false })
                .limit(5),
              supabase
                .from("message_credit_ledger")
                .select("id,action,plan_credits,refill_credits,created_at")
                .eq("salon_id", currentSalonId)
                .order("created_at", { ascending: false })
                .limit(8),
              supabase
                .from("whatsapp_message_templates")
                .select("id,template_key,template_name:meta_template_name,category,language_code,status")
                .or(`salon_id.eq.${currentSalonId},salon_id.is.null`)
                .order("template_key"),
            ]);

            if (channelError || walletError || topupError || ledgerError || templateError) {
              throw channelError || walletError || topupError || ledgerError || templateError;
            }

            setWhatsappChannels((channelData || []) as unknown as WhatsAppChannelView[]);
            setMessageWallet((walletData || null) as unknown as MessageCreditWalletRow | null);
            setCreditTopups((topupData || []) as unknown as MessageCreditTopupView[]);
            setCreditLedger((ledgerData || []) as unknown as MessageCreditLedgerView[]);
            setWhatsappTemplates((templateData || []) as unknown as WhatsAppTemplateView[]);
          } catch (err) {
            console.error("Error loading WhatsApp billing settings:", getSupabaseErrorMessage(err));
            setWhatsappChannels([]);
            setMessageWallet(null);
            setCreditTopups([]);
            setCreditLedger([]);
            setWhatsappTemplates([]);
          }
        } else {
          setWhatsappChannels([]);
          setMessageWallet(null);
          setCreditTopups([]);
          setCreditLedger([]);
          setWhatsappTemplates([]);
        }

        setData({
          salon: {
            name: salonName,
            area: salonArea,
            city: salonCity,
            type: salonType,
            timezone: salonTimezone,
            currency: salonCurrency,
            language: salonLanguage,
            bookingWindowDays: salonBookingWindowDays,
            is_active: salonIsActive,
            photos: salonPhotos,
          },
          hours: salonHours,
          services: dbServices,
          team: dbTeam,
          plan: orgPlan,
          wa: {
            ...salonWaSettings,
            number: salonWa || salonWaSettings.number,
          },
          notifs: salonNotifSettings,
          account: {
            name: userName,
            email: userEmail,
            phone: userPhone,
          },
          gst: dbGst || DEFAULT_GST_SETTINGS,
        });

      } catch (err) {
        console.error("Error loading settings from Supabase:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    let alive = true;

    const loadConnectConfig = async () => {
      try {
        const response = await fetch("/api/whatsapp/connect/config");
        const body = await response.json().catch(() => null);
        if (!alive) return;

        if (!response.ok || !body?.ok) {
          setWaConnectConfig((current) => ({
            ...current,
            loading: false,
            configured: false,
            chairbookSenderConfigured: false,
            missing: [],
          }));
          return;
        }

        setWaConnectConfig({
          loading: false,
          configured: Boolean(body.configured),
          chairbookSenderConfigured: Boolean(body.chairbookSenderConfigured),
          missing: Array.isArray(body.missing) ? body.missing : [],
          appId: body.appId || null,
          configId: body.configId || null,
          graphApiVersion: body.graphApiVersion || "v24.0",
        });
      } catch {
        if (alive) {
          setWaConnectConfig((current) => ({
            ...current,
            loading: false,
            configured: false,
          }));
        }
      }
    };

    void loadConnectConfig();
    return () => {
      alive = false;
    };
  }, []);

  const update = (next: SettingsData) => {
    setData(next);
    setDirty(true);
  };

  const refreshWhatsAppBilling = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !supabaseSalonId) return;

    const [
      { data: walletData },
      { data: topupData },
      { data: ledgerData },
    ] = await Promise.all([
      supabase
        .from("message_credit_wallets")
        .select("plan_credits,refill_credits,reserved_plan_credits,reserved_refill_credits,reset_period_start,reset_period_end")
        .eq("salon_id", supabaseSalonId)
        .maybeSingle(),
      supabase
        .from("message_credit_topups")
        .select("id,razorpay_order_id,credits,amount_paise,status,created_at")
        .eq("salon_id", supabaseSalonId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("message_credit_ledger")
        .select("id,action,plan_credits,refill_credits,created_at")
        .eq("salon_id", supabaseSalonId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    setMessageWallet((walletData || null) as unknown as MessageCreditWalletRow | null);
    setCreditTopups((topupData || []) as unknown as MessageCreditTopupView[]);
    setCreditLedger((ledgerData || []) as unknown as MessageCreditLedgerView[]);
  };

  const saveWhatsAppSenderPreference = useCallback(async (preference: WhatsAppSenderPreference) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !supabaseSalonId) {
      showFlash("Salon is still loading.");
      return;
    }

    setWaSenderSaving(true);
    try {
      const { data: salon, error: loadError } = await supabase
        .from("salons")
        .select("wa_settings")
        .eq("id", supabaseSalonId)
        .maybeSingle();
      if (loadError) throw loadError;

      const { error } = await supabase
        .from("salons")
        .update({
          wa_settings: withWhatsAppSenderPreference(salon?.wa_settings, preference),
        })
        .eq("id", supabaseSalonId);
      if (error) throw error;

      setData((current) => ({
        ...current,
        wa: {
          ...current.wa,
          senderPreference: preference,
        },
      }));
      setShowWaSenderSwitchModal(false);
      showFlash(preference === "salon_owned" ? "Using salon WhatsApp sender" : "Using ChairBook WhatsApp sender");
    } catch (err) {
      const message = getSupabaseErrorMessage(err) || "Could not update WhatsApp sender.";
      showFlash(message);
    } finally {
      setWaSenderSaving(false);
    }
  }, [showFlash, supabaseSalonId]);

  const completeEmbeddedSignup = useCallback(async () => {
    const pending = pendingEmbeddedSignup.current;
    if (!supabaseSalonId || !pending.code || !pending.info || pending.saving) {
      return;
    }

    pending.saving = true;
    setWaConnectBusy(true);
    setWaConnectStatus("Saving WhatsApp sender...");

    try {
      const response = await fetch("/api/whatsapp/connect/embedded-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId: supabaseSalonId,
          code: pending.code,
          wabaId: pending.info.wabaId,
          phoneNumberId: pending.info.phoneNumberId,
          displayNumber: pending.info.displayNumber,
          businessAccountId: pending.info.businessAccountId,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error || "Could not connect WhatsApp.");
      }

      setWhatsappChannels((current) => {
        const nextChannel: WhatsAppChannelView = {
          id: body.channelId,
          mode: "salon_owned",
          status: "active",
          credit_line_status: body.creditLineStatus || "pending",
          webhook_status: body.webhookStatus || "unknown",
          phone_number_id: pending.info?.phoneNumberId || null,
          display_number: pending.info?.displayNumber || null,
          updated_at: new Date().toISOString(),
        };
        return [nextChannel, ...current.filter((channel) => channel.mode !== "salon_owned")];
      });

      pendingEmbeddedSignup.current = {};
      setShowWaSenderSwitchModal(true);
      setWaConnectStatus("WhatsApp connected. ChairBook remains the default sender.");
      showFlash("WhatsApp connected");
    } catch (err) {
      pendingEmbeddedSignup.current.saving = false;
      const message = err instanceof Error ? err.message : "Could not connect WhatsApp.";
      setWaConnectStatus(message);
      showFlash(message);
    } finally {
      setWaConnectBusy(false);
    }
  }, [showFlash, supabaseSalonId]);

  useEffect(() => {
    const handleEmbeddedSignupMessage = (event: MessageEvent) => {
      if (!["https://www.facebook.com", "https://web.facebook.com"].includes(event.origin)) {
        return;
      }

      const info = parseEmbeddedSignupMessage(event.data);
      if (!info) return;

      pendingEmbeddedSignup.current.info = info;
      setWaConnectStatus("Meta signup finished. Waiting for authorization code...");
      void completeEmbeddedSignup();
    };

    window.addEventListener("message", handleEmbeddedSignupMessage);
    return () => window.removeEventListener("message", handleEmbeddedSignupMessage);
  }, [completeEmbeddedSignup]);

  const startWhatsAppConnect = async () => {
    if (!supabaseSalonId) {
      showFlash("Salon is still loading.");
      return;
    }
    if (waConnectConfig.loading) {
      showFlash("WhatsApp setup is still loading.");
      return;
    }
    if (!waConnectConfig.configured || !waConnectConfig.appId || !waConnectConfig.configId) {
      const missing = waConnectConfig.missing.length ? waConnectConfig.missing.join(", ") : "Meta settings";
      setWaConnectStatus(`Add ${missing} to enable Embedded Signup.`);
      showFlash("WhatsApp setup credentials are missing.");
      return;
    }

    pendingEmbeddedSignup.current = {};
    setWaConnectBusy(true);
    setWaConnectStatus("Opening Meta Embedded Signup...");

    try {
      const facebook = await loadFacebookSdk(waConnectConfig.appId, waConnectConfig.graphApiVersion);
      facebook.login((response) => {
        const code = extractEmbeddedSignupCode(response);
        if (!code) {
          setWaConnectBusy(false);
          setWaConnectStatus("Meta signup was cancelled or did not return an authorization code.");
          return;
        }

        pendingEmbeddedSignup.current.code = code;
        setWaConnectStatus("Authorization received. Finish the Meta signup window if it is still open.");
        void completeEmbeddedSignup();
      }, {
        config_id: waConnectConfig.configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          feature: "whatsapp_embedded_signup",
          sessionInfoVersion: "3",
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not open Meta Embedded Signup.";
      setWaConnectBusy(false);
      setWaConnectStatus(message);
      showFlash(message);
    }
  };

  const startCreditRefill = async (packId: string) => {
    if (!supabaseSalonId) {
      showFlash("Salon is still loading.");
      return;
    }

    const pack = Object.values(WHATSAPP_CREDIT_PACKS).find((item) => item.id === packId);
    setCreditRefilling(packId);
    try {
      const response = await fetch("/api/billing/credits/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonId: supabaseSalonId, packId }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error || "Could not start credit refill.");
      }

      const Razorpay = await loadRazorpayCheckout();
      const checkout = new Razorpay({
        key: body.keyId,
        amount: body.amountPaise,
        currency: body.currency,
        name: "ChairBook",
        description: `${body.credits} WhatsApp credits`,
        order_id: body.orderId,
        prefill: {
          name: data.account.name,
          email: data.account.email,
          contact: data.account.phone,
        },
        notes: {
          salon_id: supabaseSalonId,
          pack_id: packId,
        },
        handler: () => {
          showFlash("Payment received. Credits will update after Razorpay confirms it.");
          void refreshWhatsAppBilling();
        },
        modal: {
          ondismiss: () => showFlash("Credit refill was not completed."),
        },
      });
      checkout.open();
      showFlash(pack ? `Opening Razorpay for ${pack.credits.toLocaleString("en-IN")} credits...` : "Opening Razorpay...");
    } catch (err) {
      showFlash(err instanceof Error ? err.message : "Could not start credit refill.");
    } finally {
      setCreditRefilling(null);
    }
  };

  const sendWhatsAppTestMessage = async () => {
    const to = waTestPhone.trim() || data.wa.number;
    if (!supabaseSalonId || !to) {
      showFlash("Add a test phone number first.");
      return;
    }

    setWaTestSending(true);
    try {
      const result = await sendWhatsAppTemplateFromClient(buildBookingConfirmationPayload({
        salonId: supabaseSalonId,
        to,
        customerName: data.account.name || "there",
        serviceNames: ["ChairBook test"],
        dateLabel: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        stylistName: data.salon.name || "ChairBook",
      }));
      showFlash(result.ok ? "Test WhatsApp sent" : (result.message || "Could not send test WhatsApp."));
    } catch {
      showFlash("Could not send test WhatsApp.");
    } finally {
      setWaTestSending(false);
    }
  };

  const handleSave = async () => {
    if (data.account?.phone) {
      const cleanPhone = data.account.phone.trim().replace(/\D/g, "");
      if (cleanPhone.length > 0 && cleanPhone.length !== 10) {
        showFlash("Please enter a valid 10-digit phone number");
        return;
      }
    }

    const supabase = getSupabaseBrowserClient();
    if (supabase && supabaseUserId) {
      showFlash("Saving changes...", 10000);
      try {
        if (data.account) {
          const cleanPhone = data.account.phone ? data.account.phone.trim().replace(/\D/g, "") : "";
          const dbPhone = cleanPhone ? `+91 ${cleanPhone}` : null;
          const { error: userError } = await supabase
            .from("users")
            .update({
              name: data.account.name,
              email: data.account.email,
              phone: dbPhone
            })
            .eq("id", supabaseUserId);
          if (userError) throw userError;
        }

        if (supabaseSalonId) {
          // 1. Update Salon details
          const { error: salonError } = await supabase
            .from("salons")
            .update({
              name: data.salon.name,
              area: data.salon.area,
              city: data.salon.city,
              type: data.salon.type,
              hours: data.hours,
              wa_number: data.wa.number ? (data.wa.number.startsWith("+91") ? data.wa.number : `+91${data.wa.number.replace(/\D/g, "")}`) : null,
              timezone: data.salon.timezone || "Asia/Kolkata",
              currency: data.salon.currency || "INR",
              language: data.salon.language || "en",
              booking_window_days: normalizeBookingWindowDays(data.salon.bookingWindowDays),
              is_active: data.salon.is_active !== false,
              wa_settings: buildWhatsAppSettingsPayload(data.wa),
              notification_settings: data.notifs,
              photos: data.salon.photos || []
            })
            .eq("id", supabaseSalonId);
          if (salonError) throw salonError;

          // 1.5. Save GST details
          if (data.gst) {
            const shouldSaveGst = gstSchemaAvailable || activeTab === "gst" || data.gst.gst_enabled;

            if (shouldSaveGst) {
              const gstPayload = {
                salon_id: supabaseSalonId,
                gst_enabled: data.gst.gst_enabled,
                gstin: data.gst.gstin ? data.gst.gstin.trim().toUpperCase() : null,
                legal_name: data.gst.legal_name ? data.gst.legal_name.trim() : null,
                registered_address: data.gst.registered_address ? data.gst.registered_address.trim() : null,
                state: data.gst.state || null,
                state_code: data.gst.state_code || null,
                gst_rate: data.gst.gst_rate,
                sac_code: data.gst.sac_code ? data.gst.sac_code.trim() : "999721",
                pricing_mode: data.gst.pricing_mode,
                invoice_prefix: data.gst.invoice_prefix ? data.gst.invoice_prefix.trim().toUpperCase() : "SAL",
                updated_at: new Date().toISOString(),
              };

              const { error: gstError } = await supabase
                .from("salon_gst_settings")
                .upsert(gstPayload, { onConflict: "salon_id" });

              if (gstError) throw gstError;
              setGstSchemaAvailable(true);
            }
          }

          // 2. Save services and bundles first so new bundle components can point at real IDs.
          const { data: dbServicesList } = await supabase
            .from("services")
            .select("id")
            .eq("salon_id", supabaseSalonId)
            .is("deleted_at", null);
          const dbSvcIds = dbServicesList?.map(s => s.id) || [];
          const persistedServiceIds = new Set<string>();
          const savedIdByLocalId = new Map<string, string>();

          for (const svc of data.services) {
            const svcPayload: {
              salon_id: string;
              name: string;
              category: string;
              duration_min: number;
              price: number;
              active: boolean;
              code?: number | null;
              kind: ServiceKind;
              bundle_note?: string | null;
              deleted_at?: string | null;
              id?: string;
            } = {
              salon_id: supabaseSalonId,
              name: svc.name,
              category: getServiceKind(svc) === "bundle" ? "Bundles" : svc.cat || "General",
              duration_min: svc.duration,
              price: svc.price,
              active: svc.active ?? true,
              code: svc.code ?? null,
              kind: getServiceKind(svc),
              bundle_note: getServiceKind(svc) === "bundle" ? svc.bundle_note || null : null,
              deleted_at: null,
            };
            if (typeof svc.id === "string" && isUUID(svc.id)) {
              svcPayload.id = svc.id;
            }
            const { data: savedSvc, error: saveSvcErr } = await supabase
              .from("services")
              .upsert(svcPayload, { onConflict: "id" })
              .select("id")
              .single();
            if (saveSvcErr) throw saveSvcErr;
            if (savedSvc?.id) {
              persistedServiceIds.add(savedSvc.id);
              savedIdByLocalId.set(String(svc.id), savedSvc.id);
            }
          }

          const svcIdsToDelete = dbSvcIds.filter(id => typeof id === "string" && !persistedServiceIds.has(id));
          if (svcIdsToDelete.length > 0) {
            const { error: svcDeleteErr } = await supabase
              .from("services")
              .update({ active: false, deleted_at: new Date().toISOString() })
              .in("id", svcIdsToDelete);
            if (svcDeleteErr) throw svcDeleteErr;
          }

          const bundleRows = data.services.filter((svc) => getServiceKind(svc) === "bundle");
          const bundleIds = bundleRows
            .map((svc) => savedIdByLocalId.get(String(svc.id)) || (typeof svc.id === "string" && isUUID(svc.id) ? svc.id : null))
            .filter((id): id is string => Boolean(id));

          if (bundleIds.length > 0) {
            const { error: clearBundleErr } = await supabase
              .from("bundle_components")
              .delete()
              .in("bundle_service_id", bundleIds);
            if (clearBundleErr) throw clearBundleErr;
          }

          const componentRows = bundleRows.flatMap((bundle) => {
            const bundleId = savedIdByLocalId.get(String(bundle.id)) || (typeof bundle.id === "string" && isUUID(bundle.id) ? bundle.id : null);
            if (!bundleId) return [];
            return getComponentIds(bundle)
              .map((componentId) => savedIdByLocalId.get(String(componentId)) || (typeof componentId === "string" && isUUID(componentId) ? componentId : null))
              .filter((componentId): componentId is string => Boolean(componentId))
              .map((componentId, index) => ({
                bundle_service_id: bundleId,
                component_service_id: componentId,
                position: index,
              }));
          });

          if (componentRows.length > 0) {
            const { error: componentErr } = await supabase
              .from("bundle_components")
              .insert(componentRows);
            if (componentErr) throw componentErr;
          }

          for (const bundle of bundleRows) {
            const bundleId = savedIdByLocalId.get(String(bundle.id)) || (typeof bundle.id === "string" && isUUID(bundle.id) ? bundle.id : null);
            if (!bundleId) continue;
            const { error: bundleActiveErr } = await supabase
              .from("services")
              .update({ active: bundle.active ?? true })
              .eq("id", bundleId);
            if (bundleActiveErr) throw bundleActiveErr;
          }

          // 3. Delete removed stylists
          const { data: dbStylistsList } = await supabase
            .from("stylists")
            .select("id")
            .eq("salon_id", supabaseSalonId);
          const dbStylistIds = dbStylistsList?.map(s => s.id) || [];
          const currentTeamIds = data.team.map(t => t.id);
          const stylistIdsToDelete = dbStylistIds.filter(id => typeof id === "string" && !currentTeamIds.includes(id));
          if (stylistIdsToDelete.length > 0) {
            const { error: stylistDeleteErr } = await supabase
              .from("stylists")
              .delete()
              .in("id", stylistIdsToDelete);
            if (stylistDeleteErr) throw stylistDeleteErr;
          }

          // 5. Save team
          for (const stylist of data.team) {
            const stylistPayload: {
              salon_id: string;
              name: string;
              role_label: string;
              tone: string;
              commission_pct: number;
              active: boolean;
              email?: string | null;
              user_id?: string | null;
              specialisations?: string[];
              photo_url?: string | null;
              booking_slug?: string | null;
              id?: string;
            } = {
              salon_id: supabaseSalonId,
              name: stylist.name,
              role_label: stylist.role || "Stylist",
              tone: stylist.tone ? (stylist.tone.startsWith("tone-") ? stylist.tone : `tone-${stylist.tone}`) : "tone-a",
              commission_pct: stylist.commission ?? 0,
              active: true,
              email: stylist.email || null,
              user_id: stylist.user_id || null,
              specialisations: stylist.specialisations || [],
              photo_url: stylist.photo_url || null,
              booking_slug: stylist.booking_slug || null,
            };
            if (typeof stylist.id === "string" && !stylist.id.startsWith("temp-")) {
              stylistPayload.id = stylist.id;
            }
            await supabase
              .from("stylists")
              .upsert(stylistPayload, { onConflict: "id" });
          }

          // 6. Save Organization Plan if changed
          if (supabaseOrgId && data.plan) {
            const capitalizedPlan = data.plan.charAt(0).toUpperCase() + data.plan.slice(1).toLowerCase();
            const { data: currentOrg } = await supabase
              .from("organizations")
              .select("plan")
              .eq("id", supabaseOrgId)
              .maybeSingle();

            if (currentOrg && currentOrg.plan !== capitalizedPlan) {
              const { error: orgError } = await supabase
                .from("organizations")
                .update({ plan: capitalizedPlan })
                .eq("id", supabaseOrgId);
              if (orgError) throw orgError;

              // Insert billing invoice for the plan change
              const planPrice = data.plan === "solo" ? 499 : data.plan === "salon" ? 999 : 2499;
              await supabase
                .from("billing_invoices")
                .insert({
                  org_id: supabaseOrgId,
                  date: new Date().toISOString().split("T")[0],
                  plan_name: `${capitalizedPlan} · monthly (upgrade)`,
                  amount: planPrice,
                  payment_method: "UPI · payment simulated"
                });

              billingInvoiceList.refresh();
            }
          }

          // 7. Save extra config to LocalStorage
          localStorage.setItem("cb_settings_wa_" + supabaseSalonId, JSON.stringify(data.wa));
          localStorage.setItem("cb_settings_notifs_" + supabaseSalonId, JSON.stringify(data.notifs));

          // 8. Re-fetch services and team to update UI IDs
          const { data: freshSvcs } = await supabase
            .from("services")
            .select(SERVICE_SELECT_WITH_BUNDLES)
            .eq("salon_id", supabaseSalonId)
            .is("deleted_at", null);

          const { data: freshTeam } = await supabase
            .from("stylists")
            .select("id, name, role_label, tone, commission_pct, active, email, user_id, specialisations, photo_url, booking_slug, account_invited_at, account_accepted_at")
            .eq("salon_id", supabaseSalonId);

          setData(prev => ({
            ...prev,
            services: freshSvcs ? (freshSvcs as unknown as DbServiceRow[]).map(mapDbServiceRow) : prev.services,
            team: freshTeam ? (freshTeam as unknown as DbStylistRow[]).map((s) => ({
              id: s.id,
              name: s.name,
              role: s.role_label || "Stylist",
              tone: (s.tone || "tone-a").replace("tone-", ""),
              commission: Number(s.commission_pct || 0),
              email: s.email || null,
              user_id: s.user_id || null,
              specialisations: s.specialisations || [],
              photo_url: s.photo_url || null,
              booking_slug: s.booking_slug || null,
              account_invited_at: s.account_invited_at || null,
              account_accepted_at: s.account_accepted_at || null,
            })) : prev.team,
          }));
        }

        if (data.account) {
          updateProfileInContext({
            name: data.account.name,
            salonName: data.salon.name.toUpperCase(),
            salonArea: data.salon.area.toUpperCase(),
          });
        }

        showFlash("Changes saved successfully!");
        setDirty(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        if (isMissingGstSchemaError(err)) {
          setGstSchemaAvailable(false);
          showFlash(GST_SCHEMA_MISSING_MESSAGE, 4000);
          return;
        }

        console.error("Error saving settings to Supabase:", getSupabaseErrorMessage(err));
        const dbError = err as { code?: string; message?: string; details?: string };
        const errorText = `${dbError.message || ""} ${dbError.details || ""}`.toLowerCase();
        if (dbError.code === "23505" && errorText.includes("code")) {
          showFlash("That service code is already assigned to another service.", 3000);
        } else {
          showFlash("Failed to save changes.", 2500);
        }
      }
    } else {
      // Local preview mode save
      showFlash("Changes saved (local preview)");
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const discard = () => {
    window.location.reload();
  };

  // ----- Modal Triggers & Handlers -----
  const openAddService = (startKind: ServiceKind = "service") => {
    setServiceModal({ mode: "add", startKind });
  };

  const openEditService = (svc: Service) => {
    setServiceModal({ mode: "edit", target: svc });
  };

  const saveServiceMenuItem = (kind: ServiceKind, payload: Service) => {
    const editingId = serviceModal?.mode === "edit" ? serviceModal.target?.id : undefined;
    const resolvedCode = payload.code && payload.code > 0
      ? payload.code
      : findNextServiceCode(data.services, editingId);
    const duplicate = findDuplicateServiceCode(data.services, resolvedCode, editingId);

    if (duplicate) {
      showFlash(`Service code ${formatServiceCode(resolvedCode)} is already assigned to ${duplicate.name || "another service"}.`, 3000);
      return;
    }

    const payloadWithCode: Service = {
      ...payload,
      code: resolvedCode,
    };

    if (serviceModal?.mode === "edit" && serviceModal.target) {
      const list = data.services.map((item) => item.id === serviceModal.target?.id ? payloadWithCode : item);
      update({ ...data, services: list });
      showFlash(kind === "bundle" ? "Combo updated" : "Service updated");
      setServiceModal(null);
      return;
    }

    const newItem: Service = {
      ...payloadWithCode,
      id: `temp-${kind}-${Date.now()}`,
      kind,
      code: resolvedCode,
      active: payload.active ?? true,
    };
    update({ ...data, services: [...data.services, newItem] });
    showFlash(kind === "bundle" ? "Combo created" : "Service added");
    setServiceModal(null);
  };

  const deleteServiceMenuItem = (svc: Service) => {
    if (getServiceKind(svc) === "bundle") {
      update({ ...data, services: data.services.filter((item) => item.id !== svc.id) });
      setServiceModal(null);
      showFlash("Combo deleted");
      return;
    }

    const nextServices = data.services
      .filter((item) => item.id !== svc.id)
      .map((item) => {
        if (getServiceKind(item) !== "bundle") return item;
        const nextComponents = getComponentIds(item).filter((componentId) => componentId !== svc.id);
        return {
          ...item,
          componentIds: nextComponents,
          active: nextComponents.length >= 2 ? item.active : false,
        };
      });

    update({ ...data, services: nextServices });
    setServiceModal(null);
    showFlash("Service deleted");
  };

  const openAddStylist = () => {
    setEditingStylist(null);
    setStylistName("");
    setStylistRole("Senior stylist · 5 yrs");
    setStylistCommission(30);
    setStylistEmail("");
    setShowStylistModal(true);
  };

  const openEditStylist = (stylist: Stylist) => {
    setEditingStylist(stylist);
    setStylistName(stylist.name);
    setStylistRole(stylist.role || "Stylist");
    setStylistCommission(stylist.commission ?? 40);
    setStylistEmail(stylist.email || "");
    setShowStylistModal(true);
  };

  const saveStylist = () => {
    if (!stylistName.trim()) return;
    const toneLetters = ["a", "b", "c", "d", "e", "f"];
    const toneLetter = toneLetters[Math.floor(Math.random() * toneLetters.length)];

    if (editingStylist) {
      const list = data.team.map(t => t.id === editingStylist.id ? {
        ...t,
        name: stylistName.trim(),
        role: stylistRole,
        commission: stylistCommission,
        email: stylistEmail.trim() || null,
      } : t);
      update({ ...data, team: list });
      showFlash("Stylist updated");
    } else {
      const newStylist: Stylist = {
        id: "temp-" + Date.now(),
        name: stylistName.trim(),
        role: stylistRole,
        tone: toneLetter,
        commission: stylistCommission,
        email: stylistEmail.trim() || null,
      };
      update({ ...data, team: [...data.team, newStylist] });
      showFlash("Stylist added");
    }
    setShowStylistModal(false);
  };

  const inviteStylistAccount = async (stylist: Stylist) => {
    const email = (stylist.email || "").trim();
    if (!email) {
      showFlash("Add an email before inviting this stylist", 2400);
      return;
    }
    if (typeof stylist.id !== "string" || stylist.id.startsWith("temp-")) {
      showFlash("Save settings before inviting this new stylist", 2600);
      return;
    }

    setInvitingStylistId(stylist.id);
    try {
      const res = await fetch("/api/admin/stylists/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stylistId: stylist.id,
          email,
          name: stylist.name,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Could not invite stylist");
      }
      const list = data.team.map((item) => item.id === stylist.id ? {
        ...item,
        user_id: payload.userId,
        email: payload.email,
        account_invited_at: payload.accountInvitedAt ?? item.account_invited_at ?? null,
        account_accepted_at: payload.accountAcceptedAt ?? (payload.action === "resent" || payload.action === "sent" ? null : item.account_accepted_at ?? null),
      } : item);
      update({ ...data, team: list });
      setDirty(false);
      showFlash(payload.message || (stylist.user_id ? "Stylist invite resent" : "Stylist invite sent"));
    } catch (err) {
      showFlash(err instanceof Error ? err.message : "Could not invite stylist", 3000);
    } finally {
      setInvitingStylistId(null);
    }
  };

  const openWaChange = () => {
    let raw = data.wa.number.replace(/\s+/g, "");
    if (raw.startsWith("+91")) {
      raw = raw.slice(3);
    } else if (raw.startsWith("91") && raw.length > 10) {
      raw = raw.slice(2);
    }
    setWaNumberInput(raw);
    setShowWaModal(true);
  };

  const saveWaNumber = () => {
    const digits = waNumberInput.trim().replace(/\D/g, "");
    if (digits.length !== 10) {
      showFlash("Please enter a valid 10-digit phone number");
      return;
    }
    update({
      ...data,
      wa: {
        ...data.wa,
        number: digits
      }
    });
    setShowWaModal(false);
    showFlash("WhatsApp number updated");
  };

  const openEditTemplate = (key: keyof WhatsAppTemplates) => {
    setEditingTemplateKey(key);
    setTemplateText(data.wa.templates[key]);
  };

  const saveTemplate = () => {
    if (!editingTemplateKey) return;
    update({
      ...data,
      wa: {
        ...data.wa,
        templates: {
          ...data.wa.templates,
          [editingTemplateKey]: templateText
        }
      }
    });
    setEditingTemplateKey(null);
    showFlash("Message template updated");
  };

  const deletePhoto = (url: string) => {
    const updated = (data.salon.photos || []).filter(p => p !== url);
    update({
      ...data,
      salon: {
        ...data.salon,
        photos: updated
      }
    });
    showFlash("Photo removed (click Save to persist)");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showFlash("File size must be less than 5 MB");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase || !supabaseSalonId) {
      showFlash("Database configuration is missing.");
      return;
    }

    showFlash("Uploading photo...", 10000);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${supabaseSalonId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('salon-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('salon-photos')
        .getPublicUrl(fileName);

      // Append to local state list
      const updatedPhotos = [...(data.salon.photos || []), publicUrl];
      update({
        ...data,
        salon: {
          ...data.salon,
          photos: updatedPhotos
        }
      });
      showFlash("Photo uploaded! Click Save to persist changes.");
    } catch (err) {
      console.error("Error uploading photo:", err);
      showFlash("Failed to upload photo.", 2500);
    }
  };

  const qServices = serviceSearch.trim().toLowerCase();
  const normalServices = data.services.filter((service) => getServiceKind(service) === "service");
  const bundleServices = data.services.filter((service) => getServiceKind(service) === "bundle");
  const serviceById = new Map(data.services.map((service) => [service.id, service]));
  const matchesServiceSearch = (service: Service) => {
    if (!qServices) return true;
    const includedNames = getComponentIds(service)
      .map((id) => serviceById.get(id)?.name || "")
      .join(" ");
    return service.name.toLowerCase().includes(qServices)
      || (service.cat || service.category || "").toLowerCase().includes(qServices)
      || (service.bundle_note || "").toLowerCase().includes(qServices)
      || includedNames.toLowerCase().includes(qServices)
      || String(service.code || "").includes(qServices)
      || (service.code ? formatServiceCode(service).toLowerCase().includes(qServices) : false);
  };
  const filteredNormalServices = normalServices.filter(matchesServiceSearch);
  const filteredBundleServices = bundleServices.filter(matchesServiceSearch);
  const totalMenuItems = normalServices.length + bundleServices.length;
  const totalActiveMenuItems = data.services.filter((service) => service.active).length;
  const serviceResultCount = filteredNormalServices.length + filteredBundleServices.length;
  const serviceCategories = Array.from(new Set([
    ...SERVICE_CATEGORIES,
    ...normalServices.map((service) => service.cat || service.category || "General"),
  ]));

  // ----- RENDER TAB CONTENT -----
  const renderTabContent = () => {
    switch (activeTab) {
      case "salon":
        return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead title="Salon profile" desc="What your customers see on the booking page." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <FormField label="Salon name">
                <input
                  value={data.salon.name}
                  onChange={e => update({ ...data, salon: { ...data.salon, name: e.target.value } })}
                  style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }}
                />
              </FormField>
              <FormField label="Area / address" style={{ marginTop: 14 }}>
                <input
                  value={data.salon.area}
                  onChange={e => update({ ...data, salon: { ...data.salon, area: e.target.value } })}
                  style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }}
                />
              </FormField>
              <div className="field-row" style={{ marginTop: 14 }}>
                <FormField label="City">
                  <input
                    value={data.salon.city}
                    onChange={e => update({ ...data, salon: { ...data.salon, city: e.target.value } })}
                    style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }}
                  />
                </FormField>
                <FormField label="Salon type">
                  <select
                    value={data.salon.type}
                    onChange={e => update({ ...data, salon: { ...data.salon, type: e.target.value } })}
                    style={{ height: 40, border: "1px solid var(--line-2)", borderRadius: 8, padding: "0 10px", outline: 0, fontSize: 14, background: "#fff" }}
                  >
                    <option>Unisex salon</option>
                    <option>Ladies salon</option>
                    <option>{"Men's salon"}</option>
                    <option>Barbershop</option>
                    <option>Beauty parlour</option>
                    <option>Spa</option>
                  </select>
                </FormField>
              </div>
              <FormField label="Accept bookings for next" style={{ marginTop: 14 }}>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={MIN_BOOKING_WINDOW_DAYS}
                    max={MAX_BOOKING_WINDOW_DAYS}
                    step="1"
                    value={data.salon.bookingWindowDays}
                    onChange={e => update({
                      ...data,
                      salon: {
                        ...data.salon,
                        bookingWindowDays: normalizeBookingWindowDays(e.target.value),
                      },
                    })}
                    style={{ width: 110, padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }}
                  />
                  <span className="text-sm text-ink-2">days</span>
                  <span className="text-xs text-ink-3">Customers and staff can book today through this many selectable dates.</span>
                </div>
              </FormField>
            </div>

            <SectionHead title="Photos" desc="At least one photo helps customers trust the salon. 3:2 aspect, < 5 MB each." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="grid grid-cols-4 gap-2.5 max-[720px]:grid-cols-2">
                {(data.salon.photos || []).map((url, i) => (
                  <div key={url || i} className="relative aspect-[3/2] rounded-lg overflow-hidden border border-line group">
                    <Image src={url} alt={`Salon photo ${i + 1}`} fill sizes="(max-width: 720px) 50vw, 25vw" unoptimized className="object-cover" />
                    <button
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-rose text-white flex items-center justify-center border-0 cursor-pointer transition-colors duration-150"
                      onClick={() => deletePhoto(url)}
                      title="Remove photo"
                      style={{ border: 0, padding: 0 }}
                    >
                      <I.trash style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                ))}
                {(data.salon.photos || []).length === 0 && [1, 2, 3].map(i => (
                  <div key={i} className="relative aspect-[3/2] rounded-lg overflow-hidden border border-line opacity-60">
                    <svg viewBox="0 0 100 70" width="100%" height="100%">
                      <defs>
                        <pattern id={`stripes-${i}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(15,110,86,0.15)" strokeWidth="3" />
                        </pattern>
                      </defs>
                      <rect width="100" height="70" fill="var(--teal-soft)" />
                      <rect width="100" height="70" fill={`url(#stripes-${i})`} />
                    </svg>
                    <div className="absolute bottom-1.5 left-2 font-mono text-[10px] text-teal-ink bg-white/80 py-0.5 px-1.5 rounded">example {i}</div>
                  </div>
                ))}
                <label className="aspect-[3/2] rounded-lg bg-bg-2 border border-dashed border-line-2 flex flex-col items-center justify-center gap-1.5 font-inherit text-xs text-ink-3 cursor-pointer transition-colors duration-150 hover:bg-bg hover:border-ink-3 hover:text-ink">
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handlePhotoUpload}
                  />
                  <span className="w-7 h-7 rounded-full bg-white grid place-items-center text-lg font-light border border-line">+</span>
                  Add photo
                </label>
              </div>
            </div>

            <SectionHead title="Working hours" desc="Customers will only see slots inside these hours." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="flex flex-col gap-1">
                {DAYS.map(d => {
                  const h = data.hours[d.id] || { open: false, from: "10:00", to: "20:00" };
                  return (
                    <div key={d.id} className={`grid grid-cols-[200px_1fr] gap-4 py-2.5 border-b border-line items-center last:border-b-0 max-[720px]:grid-cols-1 max-[720px]:gap-2 ${h.open ? "" : "opacity-60"}`}>
                      <label className="flex items-center gap-3 text-sm font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-teal w-4 h-4"
                          checked={h.open}
                          onChange={e => update({ ...data, hours: { ...data.hours, [d.id]: { ...h, open: e.target.checked } } })}
                        />
                        <span>{d.name}</span>
                      </label>
                      {h.open ? (
                        <div className="flex items-center gap-2.5 justify-end max-[720px]:justify-start max-[720px]:pl-7">
                          <input
                            className="ob-time"
                            value={h.from}
                            onChange={e => update({ ...data, hours: { ...data.hours, [d.id]: { ...h, from: e.target.value } } })}
                          />
                          <span className="ob-time-sep">to</span>
                          <input
                            className="ob-time"
                            value={h.to}
                            onChange={e => update({ ...data, hours: { ...data.hours, [d.id]: { ...h, to: e.target.value } } })}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 justify-end max-[720px]:justify-start max-[720px]:pl-7 text-[13px] text-ink-3 italic">Closed</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case "services":
        return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead
              title="Services"
              desc={qServices
                ? `${serviceResultCount} match${serviceResultCount === 1 ? "" : "es"} for "${serviceSearch}"`
                : `${totalActiveMenuItems} active · ${totalMenuItems} total · ${bundleServices.length} combo${bundleServices.length === 1 ? "" : "s"}`}
              action={
                <button className="btn btn-primary btn-sm" onClick={() => openAddService()}>
                  <I.plus style={{ width: 14, height: 14 }} /> Add
                </button>
              }
            />

            <div className="flex items-center gap-2.5 bg-white border border-line-2 rounded-xl px-3.5 h-11 focus-within:border-teal">
              <I.search style={{ width: 16, height: 16, color: "var(--ink-3)" }} />
              <input
                value={serviceSearch}
                onChange={(event) => setServiceSearch(event.target.value)}
                placeholder="Search by name, category, or code (e.g. #003)..."
                className="flex-1 h-full border-0 outline-0 bg-transparent text-sm"
              />
              {serviceSearch && (
                <button className="border-0 bg-transparent cursor-pointer text-ink-3 grid place-items-center" onClick={() => setServiceSearch("")} aria-label="Clear search">
                  <I.x />
                </button>
              )}
            </div>

            <div className="bg-white border border-line rounded-xl p-0">
              {serviceCategories.map(cat => {
                const items = filteredNormalServices.filter(s => (s.cat || s.category || "General") === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="p-[12px_20px] text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 bg-bg border-b border-line flex gap-2">
                      {cat} <span className="text-ink-4 font-mono">{items.length}</span>
                    </div>
                    {items.map(s => (
                      <div key={s.id} className={`grid grid-cols-[56px_1fr_auto_auto_auto] gap-3 p-[12px_20px] items-center border-b border-line last:border-b-0 max-[720px]:grid-cols-[56px_1fr_auto] ${!s.active ? "opacity-55" : ""}`}>
                        <div className="font-mono text-xs font-semibold text-teal bg-teal-soft border border-teal-soft-2 rounded-lg px-2 py-1 text-center">
                          {s.code ? formatServiceCode(s) : "#---"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{s.name}</div>
                          <div className="text-xs text-ink-3 mt-0.5 font-mono">
                            {s.duration} min · ₹{s.price.toLocaleString("en-IN")}
                            {!s.active && " · Hidden from booking page"}
                          </div>
                        </div>
                        <label className="inline-flex cursor-pointer items-center relative shrink-0">
                          <input
                            type="checkbox"
                            className="absolute opacity-0 pointer-events-none peer"
                            checked={s.active}
                            onChange={() => {
                              const list = data.services.map(item => item.id === s.id ? { ...item, active: !item.active } : item);
                              update({ ...data, services: list });
                            }}
                          />
                          <span className="w-9 h-5.5 rounded-full bg-line-2 relative transition-colors duration-150 before:content-[''] before:absolute before:left-[2px] before:top-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform before:duration-[180ms] before:ease-[cubic-bezier(0.2,0.9,0.3,1.2)] before:shadow-[0_1px_2px_rgba(0,0,0,0.1)] peer-checked:bg-teal peer-checked:before:translate-x-[14px]"></span>
                        </label>
                        <button
                          className="cust-action wa max-[720px]:hidden"
                          style={{ opacity: 1, background: "transparent", borderColor: "var(--line)", cursor: "pointer" }}
                          onClick={() => openEditService(s)}
                        >
                          <I.edit style={{ width: 14, height: 14 }} />
                        </button>
                        <button
                          className="cust-action max-[720px]:hidden"
                          style={{ opacity: 1, background: "transparent", borderColor: "var(--line)", color: "var(--rose)", cursor: "pointer" }}
                          onClick={() => deleteServiceMenuItem(s)}
                        >
                          <I.trash style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}

              <div>
                <div className="p-[12px_20px] text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 bg-bg border-b border-line flex gap-2 items-center">
                  <span className="grid w-[14px] gap-0.5"><span className="h-0.5 rounded bg-current"></span><span className="h-0.5 rounded bg-current"></span><span className="h-0.5 rounded bg-current"></span></span>
                  Combos <span className="text-ink-4 font-mono">{filteredBundleServices.length}{qServices && filteredBundleServices.length !== bundleServices.length ? ` / ${bundleServices.length}` : ""}</span>
                  <span className="normal-case tracking-normal font-normal text-ink-4">Combo packs with a discount</span>
                </div>
                {filteredBundleServices.length === 0 && !qServices ? (
                  <div className="p-6 text-center">
                    <div className="font-semibold text-sm">No combos yet</div>
                    <div className="text-xs text-ink-3 mt-1 max-w-[420px] mx-auto">Group 2+ services into a discounted combo for wedding season, monthly packages, or first-time offers.</div>
                    <button className="btn btn-outline btn-sm mt-3" onClick={() => openAddService("bundle")}>
                      <I.plus style={{ width: 14, height: 14 }} /> Create combo
                    </button>
                  </div>
                ) : filteredBundleServices.length === 0 ? (
                  <div className="p-6 text-center text-xs text-ink-3">No matching combos.</div>
                ) : filteredBundleServices.map((bundle) => {
                  const included = getComponentIds(bundle)
                    .map((id) => serviceById.get(id))
                    .filter(Boolean) as Service[];
                  const sum = included.reduce((acc, service) => acc + Number(service.price || 0), 0);
                  const totalMin = included.reduce((acc, service) => acc + Number(service.duration || service.duration_min || 0), 0);
                  const save = Math.max(0, sum - Number(bundle.price || 0));
                  const pct = sum > 0 ? Math.round((save / sum) * 100) : 0;
                  return (
                    <div key={bundle.id} className={`grid grid-cols-[56px_1fr_auto_auto_auto] gap-3 p-[12px_20px] items-center border-b border-line last:border-b-0 max-[720px]:grid-cols-[56px_1fr_auto] ${!bundle.active ? "opacity-55" : ""}`}>
                      <div className="font-mono text-xs font-semibold text-teal bg-teal-soft border border-teal-soft-2 rounded-lg px-2 py-1 text-center">
                        {formatServiceCode(bundle)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                          {bundle.name}
                          <span className="text-[10px] uppercase tracking-[0.05em] bg-amber-soft text-amber-ink border border-amber rounded-full px-2 py-0.5">Combo</span>
                          {save > 0 && <span className="text-[10px] uppercase tracking-[0.05em] bg-teal-soft text-teal border border-teal-soft-2 rounded-full px-2 py-0.5">Save {pct}%</span>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {included.map((service, index) => (
                            <React.Fragment key={service.id}>
                              <span className="text-[11px] bg-bg-2 border border-line rounded-full px-2 py-0.5">{service.name}</span>
                              {index < included.length - 1 && <span className="text-ink-4 text-xs">+</span>}
                            </React.Fragment>
                          ))}
                        </div>
                        <div className="text-xs text-ink-3 mt-1 font-mono">
                          {totalMin || bundle.duration} min · <span className="text-ink font-semibold">{inr(bundle.price)}</span>
                          {save > 0 && <span className="line-through ml-1">{inr(sum)}</span>}
                          {!bundle.active && " · Hidden from booking page"}
                          {bundle.bundle_note && bundle.active && <span className="font-sans"> · {bundle.bundle_note}</span>}
                        </div>
                      </div>
                      <label className="inline-flex cursor-pointer items-center relative shrink-0">
                        <input
                          type="checkbox"
                          className="absolute opacity-0 pointer-events-none peer"
                          checked={bundle.active}
                          onChange={() => {
                            const list = data.services.map(item => item.id === bundle.id ? { ...item, active: !item.active } : item);
                            update({ ...data, services: list });
                          }}
                        />
                        <span className="w-9 h-5.5 rounded-full bg-line-2 relative transition-colors duration-150 before:content-[''] before:absolute before:left-[2px] before:top-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform before:duration-[180ms] before:ease-[cubic-bezier(0.2,0.9,0.3,1.2)] before:shadow-[0_1px_2px_rgba(0,0,0,0.1)] peer-checked:bg-teal peer-checked:before:translate-x-[14px]"></span>
                      </label>
                      <button
                        className="cust-action wa max-[720px]:hidden"
                        style={{ opacity: 1, background: "transparent", borderColor: "var(--line)", cursor: "pointer" }}
                        onClick={() => openEditService(bundle)}
                      >
                        <I.edit style={{ width: 14, height: 14 }} />
                      </button>
                      <button
                        className="cust-action max-[720px]:hidden"
                        style={{ opacity: 1, background: "transparent", borderColor: "var(--line)", color: "var(--rose)", cursor: "pointer" }}
                        onClick={() => deleteServiceMenuItem(bundle)}
                      >
                        <I.trash style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case "team":
        return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead
              title="Team"
              desc={`${data.team.length} stylists${data.plan === "salon" ? " · Up to 5 on your plan" : ""}`}
              action={
                <button className="btn btn-primary btn-sm" onClick={openAddStylist}>
                  <I.plus style={{ width: 14, height: 14 }} /> Add stylist
                </button>
              }
            />
            <div className="bg-white border border-line rounded-xl p-0">
              {data.team.map(s => (
                <div key={s.id} className="grid grid-cols-[40px_1fr_auto_auto] gap-3.5 p-[14px_20px] items-center border-b border-line last:border-b-0 max-[720px]:grid-cols-[40px_1fr]">
                  <Avatar initials={s.name[0]} tone={s.tone} size="md" src={s.photo_url} alt={s.name} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{s.name}</div>
                    <div className="text-xs text-ink-3 mt-0.5">{s.role}</div>
                    <div className="text-[11px] text-ink-3 mt-1">
                      {s.account_accepted_at ? "Account active" : s.user_id ? "Invite pending" : s.email ? "Email added · invite optional" : "No account access"}
                    </div>
                  </div>
                  <div className="text-right px-2.5 border-l border-line max-[720px]:col-span-full max-[720px]:p-0 max-[720px]:border-0 max-[720px]:text-left max-[720px]:flex max-[720px]:items-baseline max-[720px]:gap-2">
                    <div className="text-base font-semibold tracking-[-0.015em]">{s.commission}%</div>
                    <div className="text-[10px] text-ink-3 tracking-[0.04em] uppercase max-[720px]:before:content-['·'] max-[720px]:before:mr-1">Commission</div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {!s.account_accepted_at && (
                      <button
                        className="h-8 px-2.5 rounded-lg border border-line bg-white text-xs font-medium text-ink-2 cursor-pointer hover:bg-bg-2 disabled:opacity-50"
                        onClick={() => inviteStylistAccount(s)}
                        disabled={invitingStylistId === s.id}
                        title={s.user_id ? "Resend pending invite" : s.email ? "Invite account access" : "Add email to enable invite"}
                      >
                        {invitingStylistId === s.id ? (s.user_id ? "Resending" : "Inviting") : (s.user_id ? "Resend" : "Invite")}
                      </button>
                    )}
                    <button
                      className="cust-action wa"
                      style={{ opacity: 1, background: "transparent", borderColor: "var(--line)", cursor: "pointer" }}
                      onClick={() => openEditStylist(s)}
                    >
                      <I.edit style={{ width: 14, height: 14 }} />
                    </button>
                    <button
                      className="cust-action"
                      style={{ opacity: 1, background: "transparent", borderColor: "var(--line)", color: "var(--rose)", cursor: "pointer" }}
                      onClick={() => {
                        const list = data.team.filter(item => item.id !== s.id);
                        update({ ...data, team: list });
                      }}
                    >
                      <I.trash style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "whatsapp": {
        const ownedChannel = whatsappChannels.find((channel) => channel.mode === "salon_owned");
        const senderPreference = normalizeWhatsAppSenderPreference(data.wa.senderPreference);
        const ownedChannelUsable = Boolean(
          ownedChannel?.status === "active"
          && ownedChannel.credit_line_status === "active"
          && ownedChannel.phone_number_id
        );
        const usingSalonOwnedSender = senderPreference === "salon_owned" && ownedChannelUsable;
        const activeChannel = usingSalonOwnedSender ? ownedChannel : null;
        const walletSummary = buildWalletSummary(messageWallet);
        const availableCredits = walletSummary.availableCredits;
        const templateStatus = new Map(whatsappTemplates.map((template) => [template.template_key, template.status]));
        const activeSenderLabel = usingSalonOwnedSender
          ? ownedChannel?.display_number || "Salon-owned WhatsApp"
          : "ChairBook WhatsApp";
        const activeSenderMode = usingSalonOwnedSender
          ? "Salon-owned number"
          : senderPreference === "salon_owned"
            ? "ChairBook sender while your number finishes activation"
            : "ChairBook sender";
        const channelTone = usingSalonOwnedSender
          ? "green"
          : waConnectConfig.chairbookSenderConfigured ? "green" : "amber";
        const creditTone = usingSalonOwnedSender
          ? "green"
          : waConnectConfig.chairbookSenderConfigured ? "green" : "amber";
        const webhookTone = usingSalonOwnedSender
          ? ownedChannel?.webhook_status === "subscribed" ? "green" : ownedChannel?.webhook_status === "error" ? "rose" : "gray"
          : "gray";

        return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead title="WhatsApp integration" desc="ChairBook WhatsApp is the default sender. Salons can switch to their own number after activation." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="flex justify-between items-start gap-4 max-[720px]:flex-col">
                <div className="flex items-start gap-3.5 min-w-0">
                  <I.wa style={{ color: "var(--wa)", width: 24, height: 24 }} />
                  <div>
                    <div className="text-sm font-semibold">{activeSenderLabel}</div>
                    <div className="text-xs text-ink-3 mt-1">Sender mode: {activeSenderMode}</div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge tone={channelTone}>{usingSalonOwnedSender ? `Channel ${activeChannel?.status}` : `ChairBook ${waConnectConfig.chairbookSenderConfigured ? "configured" : "missing"}`}</Badge>
                      <Badge tone={creditTone}>{usingSalonOwnedSender ? `Credit line ${activeChannel?.credit_line_status}` : "ChairBook credit line"}</Badge>
                      <Badge tone={webhookTone}>Webhook {usingSalonOwnedSender ? activeChannel?.webhook_status || "unknown" : "managed by ChairBook"}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 max-[720px]:items-start">
                  <div className="flex gap-2 max-[520px]:flex-col">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={startWhatsAppConnect}
                      disabled={waConnectBusy || waConnectConfig.loading}
                    >
                      <I.wa style={{ width: 15, height: 15 }} />
                      {waConnectBusy ? "Connecting" : ownedChannel ? "Reconnect WhatsApp" : "Connect WhatsApp"}
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={openWaChange}>Update display number</button>
                  </div>
                  {!waConnectConfig.loading && !waConnectConfig.configured && (
                    <div className="text-xs text-ink-3 max-w-[260px] text-right max-[720px]:text-left">
                      Missing: {waConnectConfig.missing.length ? waConnectConfig.missing.join(", ") : "WhatsApp setup env"}
                    </div>
                  )}
                  {!waConnectConfig.loading && !waConnectConfig.chairbookSenderConfigured && (
                    <div className="text-xs max-w-[300px] text-right max-[720px]:text-left" style={{ color: "var(--amber)" }}>
                      Add WHATSAPP_CHAIRBOOK_ACCESS_TOKEN and WHATSAPP_CHAIRBOOK_PHONE_NUMBER_ID to enable the default sender.
                    </div>
                  )}
                  {waConnectStatus && (
                    <div className="text-xs text-ink-3 max-w-[300px] text-right max-[720px]:text-left">
                      {waConnectStatus}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-5 max-[720px]:grid-cols-1">
                <button
                  type="button"
                  aria-pressed={senderPreference === "chairbook"}
                  className={`text-left rounded-lg border p-3 cursor-pointer transition ${senderPreference === "chairbook" ? "border-teal bg-teal-soft" : "border-line bg-white hover:bg-bg-2"}`}
                  onClick={() => void saveWhatsAppSenderPreference("chairbook")}
                  disabled={waSenderSaving}
                >
                  <div className="text-sm font-semibold">ChairBook sender</div>
                  <div className="text-xs text-ink-3 mt-1">Customers receive messages from ChairBook WhatsApp, branded for your salon.</div>
                </button>
                <button
                  type="button"
                  aria-pressed={senderPreference === "salon_owned"}
                  className={`text-left rounded-lg border p-3 transition ${senderPreference === "salon_owned" ? "border-teal bg-teal-soft" : "border-line bg-white hover:bg-bg-2"} ${ownedChannelUsable ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                  onClick={() => void saveWhatsAppSenderPreference("salon_owned")}
                  disabled={!ownedChannelUsable || waSenderSaving}
                >
                  <div className="text-sm font-semibold">My WhatsApp number</div>
                  <div className="text-xs text-ink-3 mt-1">
                    {ownedChannel
                      ? ownedChannelUsable
                        ? "Customers receive messages from your WhatsApp Business profile."
                        : "Connected, but waiting for active channel and credit line status."
                      : "Connect your WhatsApp Business number to enable this sender."}
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-1">
              <div className="bg-white border border-line rounded-xl p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Available credits</div>
                <div className="text-2xl font-semibold text-ink mt-1 font-mono">{availableCredits.toLocaleString("en-IN")}</div>
                <div className="text-xs text-ink-3 mt-1">Plan and refill credits after reserved sends.</div>
              </div>
              <div className="bg-white border border-line rounded-xl p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Plan balance</div>
                <div className="text-2xl font-semibold text-ink mt-1 font-mono">{walletSummary.planCredits.toLocaleString("en-IN")}</div>
                <div className="text-xs text-ink-3 mt-1">Resets monthly. No rollover.</div>
              </div>
              <div className="bg-white border border-line rounded-xl p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Refill balance</div>
                <div className="text-2xl font-semibold text-ink mt-1 font-mono">{walletSummary.refillCredits.toLocaleString("en-IN")}</div>
                <div className="text-xs text-ink-3 mt-1">Rolls over until used.</div>
              </div>
            </div>

            {availableCredits <= 25 && (
              <div className="bg-amber-soft border border-amber-soft rounded-xl p-[14px_16px] text-sm text-ink-2">
                WhatsApp credits are low. Automated billable sends will stop when the balance reaches zero.
              </div>
            )}

            <SectionHead title="Test message" desc="Send one approved utility template to verify the active sender." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px] flex gap-3 max-[720px]:flex-col">
              <input
                value={waTestPhone}
                onChange={(event) => setWaTestPhone(event.target.value)}
                placeholder={data.wa.number ? `+91 ${data.wa.number}` : "Customer WhatsApp number"}
                className="flex-1 h-10 rounded-lg border border-line-2 px-3 text-sm outline-none focus:border-teal"
              />
              <button className="btn btn-wa btn-sm" style={{ background: "var(--wa)", color: "#fff" }} onClick={sendWhatsAppTestMessage} disabled={waTestSending || availableCredits <= 0}>
                <I.wa style={{ width: 15, height: 15 }} /> {waTestSending ? "Sending" : "Send test"}
              </button>
            </div>

            <SectionHead title="Automations" desc="Only utility messages are enabled in this release." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="flex justify-between items-center gap-4 py-3.5 border-b border-line first:pt-0 last:border-b-0 last:pb-0">
                <div>
                  <div className="text-sm font-semibold">Auto-confirm via WhatsApp</div>
                  <div className="text-xs text-ink-3 mt-0.5 max-w-[480px]">New bookings send the approved confirmation template when credits and sender are active.</div>
                </div>
                <label className="inline-flex cursor-pointer items-center relative shrink-0">
                  <input
                    type="checkbox"
                    className="absolute opacity-0 pointer-events-none peer"
                    checked={data.wa.autoConfirm}
                    onChange={e => update({ ...data, wa: { ...data.wa, autoConfirm: e.target.checked } })}
                  />
                  <span className="w-9 h-5.5 rounded-full bg-line-2 relative transition-colors duration-150 before:content-[''] before:absolute before:left-[2px] before:top-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform before:duration-[180ms] before:ease-[cubic-bezier(0.2,0.9,0.3,1.2)] before:shadow-[0_1px_2px_rgba(0,0,0,0.1)] peer-checked:bg-teal peer-checked:before:translate-x-[14px]"></span>
                </label>
              </div>
              <div className="flex justify-between items-center gap-4 py-3.5 border-b border-line first:pt-0 last:border-b-0 last:pb-0">
                <div>
                  <div className="text-sm font-semibold">Send reminders {data.wa.reminder} hours before</div>
                  <div className="text-xs text-ink-3 mt-0.5 max-w-[480px]">The protected cron sends each reminder once and records the WhatsApp message.</div>
                </div>
                <select
                  value={data.wa.reminder}
                  onChange={e => update({ ...data, wa: { ...data.wa, reminder: parseInt(e.target.value) } })}
                  style={{ width: 100, height: 36, padding: "0 10px", border: "1px solid var(--line-2)", borderRadius: 8, background: "#fff", outline: 0 }}
                >
                  <option value={6}>6 hrs</option>
                  <option value={12}>12 hrs</option>
                  <option value={24}>24 hrs</option>
                  <option value={48}>48 hrs</option>
                </select>
              </div>
              <div className="flex justify-between items-center gap-4 py-3.5 border-b border-line first:pt-0 last:border-b-0 last:pb-0">
                <div>
                  <div className="text-sm font-semibold">Promotional broadcasts</div>
                  <div className="text-xs text-ink-3 mt-0.5 max-w-[480px]">Locked until opt-in, unsubscribe, template approval, and cost preview are implemented.</div>
                </div>
                <Badge tone="gray">Disabled</Badge>
              </div>
            </div>

            <SectionHead title="Message templates" desc="Meta-approved template status from the server." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="flex gap-3.5 py-3 border-b border-line items-start first:pt-0 last:border-b-0 last:pb-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-semibold">Booking confirmation</div>
                    <Badge tone={templateStatus.get("booking_confirmation") === "approved" ? "green" : "amber"}>{templateStatus.get("booking_confirmation") || "pending"}</Badge>
                  </div>
                  <div className="text-xs text-ink-3 mt-1 bg-bg-2 p-[8px_10px] rounded-lg font-mono leading-[1.45]">{data.wa.templates?.confirmation}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => openEditTemplate("confirmation")}>
                  <I.edit style={{ marginRight: 4 }} /> Edit
                </button>
              </div>
              <div className="flex gap-3.5 py-3 border-b border-line items-start first:pt-0 last:border-b-0 last:pb-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-semibold">Reminder</div>
                    <Badge tone={templateStatus.get("booking_reminder") === "approved" ? "green" : "amber"}>{templateStatus.get("booking_reminder") || "pending"}</Badge>
                  </div>
                  <div className="text-xs text-ink-3 mt-1 bg-bg-2 p-[8px_10px] rounded-lg font-mono leading-[1.45]">{data.wa.templates?.reminder}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => openEditTemplate("reminder")}>
                  <I.edit style={{ marginRight: 4 }} /> Edit
                </button>
              </div>
              <div className="flex gap-3.5 py-3 border-b border-line items-start first:pt-0 last:border-b-0 last:pb-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-semibold">Re-engagement</div>
                    <Badge tone="gray">Marketing disabled</Badge>
                  </div>
                  <div className="text-xs text-ink-3 mt-1 bg-bg-2 p-[8px_10px] rounded-lg font-mono leading-[1.45]">{data.wa.templates?.reengagement}</div>
                </div>
                <button className="btn btn-ghost btn-sm" disabled style={{ opacity: 0.5 }}>
                  <I.edit style={{ marginRight: 4 }} /> Edit
                </button>
              </div>
            </div>
          </div>
        );
      }

      case "plan":
        const current = PLANS.find(p => p.id === data.plan) || PLANS[1];
        const walletSummary = buildWalletSummary(messageWallet);
        const planAvailableCredits = walletSummary.availableCredits;
        return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead title="Current plan" />
            <div className="bg-teal-soft border border-teal-soft-2 rounded-xl p-[20px_22px] flex justify-between items-center gap-6 max-[720px]:flex-col max-[720px]:items-start">
              <div className="flex-1 min-w-0">
                <Badge tone="confirmed" showDot={false} style={{ marginBottom: 8, padding: "4px 10px" }}>
                  {current.name.toUpperCase()} PLAN · ACTIVE
                </Badge>
                <div className="text-[32px] font-semibold tracking-[-0.025em] text-teal-ink">
                  ₹{current.price.toLocaleString("en-IN")}<span className="text-sm font-normal text-ink-3"> / month</span>
                </div>
                <div className="text-[13px] text-ink-2 mt-1">{current.desc} · Next charge on 1 June 2026</div>
              </div>
              <div className="flex flex-col gap-2 items-end max-[720px]:flex-row max-[720px]:self-stretch">
                <button className="btn btn-outline btn-sm" onClick={() => showFlash("Plan management is a mockup")}>Manage payment</button>
                <button className="btn btn-ghost btn-sm" style={{ color: "var(--rose)" }} onClick={() => showFlash("Plan cancellation is a mockup")}>Cancel plan</button>
              </div>
            </div>

            <SectionHead title="WhatsApp credits" desc="ChairBook pays Meta; salons use prepaid ChairBook credits." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Included monthly</div>
                  <div className="text-xl font-semibold font-mono mt-1">{current.whatsappCredits.toLocaleString("en-IN")}</div>
                  <div className="text-xs text-ink-3 mt-1">Resets every billing period.</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Available now</div>
                  <div className="text-xl font-semibold font-mono mt-1">{planAvailableCredits.toLocaleString("en-IN")}</div>
                  <div className="text-xs text-ink-3 mt-1">Plan plus refill credits.</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Reserved</div>
                  <div className="text-xl font-semibold font-mono mt-1">{walletSummary.reservedCredits.toLocaleString("en-IN")}</div>
                  <div className="text-xs text-ink-3 mt-1">Held while sends are in progress.</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Refill rollover</div>
                  <div className="text-xl font-semibold font-mono mt-1">{walletSummary.refillCredits.toLocaleString("en-IN")}</div>
                  <div className="text-xs text-ink-3 mt-1">Unused refill credits stay available.</div>
                </div>
              </div>
            </div>

            <SectionHead title="Refill packs" desc="Razorpay payment credits the wallet after webhook confirmation." />
            <div className="grid grid-cols-3 gap-3 max-[720px]:grid-cols-1">
              {Object.values(WHATSAPP_CREDIT_PACKS).map((pack) => (
                <div key={pack.id} className="bg-white border border-line rounded-xl p-4">
                  <div className="text-sm font-semibold">{pack.label}</div>
                  <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
                    ₹{(pack.amountPaise / 100).toLocaleString("en-IN")}<span className="text-xs font-normal text-ink-3"> / {pack.credits.toLocaleString("en-IN")} credits</span>
                  </div>
                  <button className="btn btn-outline btn-sm w-full mt-3" onClick={() => startCreditRefill(pack.id)} disabled={creditRefilling === pack.id}>
                    {creditRefilling === pack.id ? "Opening Razorpay" : "Refill credits"}
                  </button>
                </div>
              ))}
            </div>

            <SectionHead title="Credit usage" />
            <div className="bg-white border border-line rounded-xl p-0">
              {creditLedger.length > 0 ? (
                creditLedger.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-[1fr_auto_auto] gap-3.5 p-[14px_20px] items-center border-b border-line last:border-b-0 max-[720px]:grid-cols-[1fr_auto]">
                    <div>
                      <div className="text-[13px] font-semibold capitalize">{entry.action.replace("_", " ")}</div>
                      <div className="text-xs text-ink-3 mt-0.5">{entry.created_at ? new Date(entry.created_at).toLocaleString("en-IN") : "Pending"}</div>
                    </div>
                    <div className="text-xs text-ink-3">Plan {entry.plan_credits}</div>
                    <div className="text-xs text-ink-3">Refill {entry.refill_credits}</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)", fontSize: 13, fontStyle: "italic" }}>
                  No WhatsApp credit activity yet.
                </div>
              )}
            </div>

            {creditTopups.length > 0 && (
              <>
                <SectionHead title="Recent refills" />
                <div className="bg-white border border-line rounded-xl p-0">
                  {creditTopups.map((topup) => (
                    <div key={topup.id} className="grid grid-cols-[1fr_auto_auto] gap-3.5 p-[14px_20px] items-center border-b border-line last:border-b-0 max-[720px]:grid-cols-[1fr_auto]">
                      <div>
                        <div className="text-[13px] font-semibold">{topup.credits.toLocaleString("en-IN")} credits</div>
                        <div className="text-xs text-ink-3 mt-0.5">{topup.razorpay_order_id || "Razorpay order pending"}</div>
                      </div>
                      <Badge tone={topup.status === "paid" ? "green" : topup.status === "failed" ? "rose" : "amber"}>{topup.status}</Badge>
                      <div className="text-sm font-semibold font-mono">₹{(topup.amount_paise / 100).toLocaleString("en-IN")}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <SectionHead title="Change plan" desc="Upgrade or downgrade anytime. Pro-rated to your next bill." />
            <div className="grid grid-cols-3 gap-3 max-[720px]:grid-cols-1">
              {PLANS.map(p => {
                const isCurrent = p.id === data.plan;
                return (
                  <div key={p.id} className={`bg-white border rounded-xl p-4.5 transition-colors duration-150 ${isCurrent ? "border-teal" : "border-line"}`}>
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
                      ₹{p.price.toLocaleString("en-IN")}<span className="text-xs font-normal text-ink-3">/mo</span>
                    </div>
                    <div className="text-xs mt-1 text-ink-2">{p.desc}</div>
                    <button
                      className="btn btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ marginTop: 14, width: "100%" }}
                      onClick={() => update({ ...data, plan: p.id })}
                      disabled={isCurrent}
                    >
                      {isCurrent ? "Current plan" : "Switch to " + p.name}
                    </button>
                  </div>
                );
              })}
            </div>

            <SectionHead title="Billing history" />
            <BillingInvoiceHistory list={billingInvoiceList} onReceipt={() => showFlash("Downloading receipt...")} />
          </div>
        );

      case "gst": {
        const gstForm = data.gst || DEFAULT_GST_SETTINGS;
        const gstinResult = gstForm.gstin ? validateGstin(gstForm.gstin) : null;
        const gstinValid = gstForm.gstin ? (gstinResult?.valid ?? false) : true;
        const updateGst = (patch: Partial<SalonGstSettings>) => {
          const updated = { ...gstForm, ...patch };
          if (patch.gstin && patch.gstin.length === 15) {
            const result = validateGstin(patch.gstin);
            if (result.valid && result.stateCode && result.stateName) {
              updated.state = result.stateName;
              updated.state_code = result.stateCode;
            }
          }
          update({ ...data, gst: updated });
        };
        return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead title="GST & Billing" desc="Configure GST for customer invoices." />
            {/* Enable / Disable Toggle */}
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-semibold">GST invoicing</div>
                  <div className="text-xs text-ink-3 mt-0.5">
                    {gstForm.gst_enabled
                      ? "Tax invoices will be generated for every completed payment."
                      : "Enable to generate GST-compliant invoices for customers."}
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center relative shrink-0">
                  <input type="checkbox" className="absolute opacity-0 pointer-events-none peer" checked={gstForm.gst_enabled} onChange={e => updateGst({ gst_enabled: e.target.checked })} />
                  <div className="w-[44px] h-[24px] rounded-full bg-line peer-checked:bg-teal transition" />
                  <div className="absolute left-[3px] top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition peer-checked:translate-x-[20px]" />
                </label>
              </div>
            </div>
            {gstForm.gst_enabled && (
              <>
                {/* Business details */}
                <div className="bg-white border border-line rounded-xl p-[20px_22px]">
                  <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 mb-3">Business details</div>
                  <FormField label="GSTIN">
                    <input value={gstForm.gstin} onChange={e => updateGst({ gstin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15) })} placeholder="e.g. 27AABCU9603R1ZM" maxLength={15} style={{ padding: "10px 12px", border: `1px solid ${gstForm.gstin && !gstinValid ? "var(--red)" : "var(--line-2)"}`, borderRadius: 8, outline: 0, fontSize: 14, fontFamily: "monospace", letterSpacing: "0.05em" }} />
                    {gstForm.gstin && !gstinValid && <div className="text-xs text-red-500 mt-1">Invalid GSTIN format</div>}
                    {gstinResult?.valid && <div className="text-xs text-teal-ink mt-1">{"\u2713"} {gstinResult.stateName} ({gstinResult.stateCode})</div>}
                  </FormField>
                  <FormField label="Legal business name" style={{ marginTop: 14 }}>
                    <input value={gstForm.legal_name} onChange={e => updateGst({ legal_name: e.target.value })} placeholder="As on GST certificate" style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }} />
                  </FormField>
                  <FormField label="Registered address" style={{ marginTop: 14 }}>
                    <textarea value={gstForm.registered_address} onChange={e => updateGst({ registered_address: e.target.value })} placeholder="Full address as per GST registration" rows={2} style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, resize: "vertical" }} />
                  </FormField>
                  <div className="field-row" style={{ marginTop: 14 }}>
                    <FormField label="State">
                      <select value={gstForm.state_code || ""} onChange={e => { const opt = INDIAN_STATE_OPTIONS.find(s => s.code === e.target.value); if (opt) updateGst({ state: opt.name, state_code: opt.code }); }} style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, background: "#fff" }}>
                        <option value="">Select state</option>
                        {INDIAN_STATE_OPTIONS.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                      </select>
                    </FormField>
                    <FormField label="State code">
                      <input value={gstForm.state_code || ""} readOnly style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, background: "var(--bg)", maxWidth: 80 }} />
                    </FormField>
                  </div>
                </div>
                {/* Tax configuration */}
                <div className="bg-white border border-line rounded-xl p-[20px_22px]">
                  <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 mb-3">Tax configuration</div>
                  <div className="text-xs font-semibold text-ink-2 mb-2">Pricing mode</div>
                  <div className="flex gap-2 mb-4">
                    {(["tax_inclusive", "tax_exclusive"] as const).map(mode => (
                      <button key={mode} className={`flex-1 p-3 rounded-lg border text-sm font-medium text-left transition ${gstForm.pricing_mode === mode ? "border-teal bg-teal-soft text-teal-ink" : "border-line bg-white text-ink-2 hover:border-ink-3"}`} onClick={() => updateGst({ pricing_mode: mode })}>
                        <div className="font-semibold">{mode === "tax_inclusive" ? "Tax inclusive" : "Tax exclusive"}</div>
                        <div className="text-xs mt-0.5 opacity-70">{mode === "tax_inclusive" ? "Prices already include GST" : "GST added on top of prices"}</div>
                      </button>
                    ))}
                  </div>
                  <div className="field-row">
                    <FormField label="GST rate (%)">
                      <input type="number" value={gstForm.gst_rate} onChange={e => updateGst({ gst_rate: parseFloat(e.target.value) || 0 })} min={0} max={100} step={0.5} style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, maxWidth: 100 }} />
                      <div className="text-xs text-ink-3 mt-1">CGST {(gstForm.gst_rate / 2).toFixed(1)}% + SGST {(gstForm.gst_rate / 2).toFixed(1)}%</div>
                    </FormField>
                    <FormField label="SAC code">
                      <input value={gstForm.sac_code} onChange={e => updateGst({ sac_code: e.target.value.replace(/\D/g, "").slice(0, 8) })} style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, fontFamily: "monospace", maxWidth: 120 }} />
                      <div className="text-xs text-ink-3 mt-1">Default: 999721 (Salon services)</div>
                    </FormField>
                    <FormField label="Invoice prefix">
                      <input value={gstForm.invoice_prefix} onChange={e => updateGst({ invoice_prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) })} maxLength={6} style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, fontFamily: "monospace", maxWidth: 100 }} />
                      <div className="text-xs text-ink-3 mt-1">e.g. SAL = SAL-2627-000001</div>
                    </FormField>
                  </div>
                </div>

                <GstInvoiceHistory list={gstInvoiceList} />
              </>
            )}
          </div>
        );
      }

      case "notifs":
        const rows = [
          { id: "newBooking", label: "New booking received",       desc: "When a customer books online or by walk-in." },
          { id: "cancel",     label: "Booking cancelled / changed", desc: "Last-minute changes you need to know about." },
          { id: "noshow",     label: "No-show flagged",             desc: "When a confirmed booking didn't arrive." },
          { id: "daily",      label: "Daily morning summary",       desc: "A WhatsApp digest of your day at 8 AM." },
        ];
        const channels = ["push", "sms", "wa"] as const;
        const channelLabel = { push: "Push", sms: "SMS", wa: "WhatsApp" };
        return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead title="Notifications" desc="Choose how you'd like to be alerted." />
            <div className="bg-white border border-line rounded-xl p-0">
              <div className="grid grid-cols-[1fr_80px_80px_100px] gap-2 p-[14px_20px] bg-bg border-b border-line text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 max-[720px]:hidden">
                <div></div>
                {channels.map(c => (
                  <div key={c} className="text-center">{channelLabel[c]}</div>
                ))}
              </div>
              {rows.map(r => {
                const notifChannels = data.notifs[r.id] || { push: false, sms: false, wa: false };
                return (
                  <div key={r.id} className="grid grid-cols-[1fr_80px_80px_100px] gap-2 p-[16px_20px] items-center border-b border-line last:border-b-0 max-[720px]:grid-cols-1 max-[720px]:gap-3">
                    <div>
                      <div className="text-sm font-semibold">{r.label}</div>
                      <div className="text-xs text-ink-3 mt-0.5">{r.desc}</div>
                    </div>
                    {channels.map(c => (
                      <div key={c} className="text-center max-[720px]:flex max-[720px]:justify-between max-[720px]:items-center">
                        <span className="hidden max-[720px]:inline text-xs text-ink-2 font-medium">{channelLabel[c]}</span>
                        <label className="inline-flex cursor-pointer items-center relative shrink-0">
                          <input
                            type="checkbox"
                            className="absolute opacity-0 pointer-events-none peer"
                            checked={notifChannels[c] || false}
                            onChange={e => {
                              const updatedNotif = {
                                ...notifChannels,
                                [c]: e.target.checked
                              };
                              update({
                                ...data,
                                notifs: {
                                  ...data.notifs,
                                  [r.id]: updatedNotif
                                }
                              });
                            }}
                          />
                          <span className="w-9 h-5.5 rounded-full bg-line-2 relative transition-colors duration-150 before:content-[''] before:absolute before:left-[2px] before:top-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform before:duration-[180ms] before:ease-[cubic-bezier(0.2,0.9,0.3,1.2)] before:shadow-[0_1px_2px_rgba(0,0,0,0.1)] peer-checked:bg-teal peer-checked:before:translate-x-[14px]"></span>
                        </label>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "attendance":
        return <AttendanceSettingsForm salonId={supabaseSalonId} />;

      case "account":
        return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead title="Your profile" />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="field-row">
                <FormField label="Name">
                  <input
                    value={data.account?.name || ""}
                    onChange={e => update({ ...data, account: { ...data.account, name: e.target.value } })}
                    className="p-[10px_12px] border border-line-2 rounded-lg outline-none text-sm w-full"
                  />
                </FormField>
                <FormField label="Phone (contact)">
                  <PhoneInput
                    value={data.account?.phone || ""}
                    onChange={val => update({ ...data, account: { ...data.account, phone: val } })}
                  />
                </FormField>
              </div>
              <FormField label="Email (for receipts &amp; reports)" className="mt-3.5">
                <input
                  value={data.account?.email || ""}
                  onChange={e => update({ ...data, account: { ...data.account, email: e.target.value } })}
                  className="p-[10px_12px] border border-line-2 rounded-lg outline-none text-sm w-full"
                />
              </FormField>
            </div>

            <SectionHead title="Preferences" />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <RowField label="Language" value="English" action={<span className="text-xs text-ink-3 font-semibold uppercase tracking-wider bg-bg-2 p-[3px_8px] rounded border border-line">Fixed</span>} />
              <RowField label="Timezone" value="Asia/Kolkata (IST)" hint="Used for booking times and reports." action={<span className="text-xs text-ink-3 font-semibold uppercase tracking-wider bg-bg-2 p-[3px_8px] rounded border border-line">Fixed</span>} />
              <RowField label="Currency" value="Indian Rupee · ₹" action={<span className="text-xs text-ink-3 font-semibold uppercase tracking-wider bg-bg-2 p-[3px_8px] rounded border border-line">Fixed</span>} />
            </div>

            <SectionHead title="Danger zone" desc="Be careful here." />
            <div className="bg-white border border-rose-soft rounded-xl p-[20px_22px]">
              <RowField
                label="Export all data"
                value="Get a ZIP with customers, bookings, and reports."
                action={<button className="btn btn-outline btn-sm" onClick={() => showFlash("Exporting data ZIP...")}>Request export</button>}
              />
              <RowField
                label={data.salon.is_active !== false ? "Pause salon" : "Resume salon"}
                value={data.salon.is_active !== false ? "Stops new bookings without deleting data." : "Allows customers to book appointments again."}
                action={
                  <button
                    className="btn btn-outline btn-sm"
                    style={{
                      color: data.salon.is_active !== false ? "var(--amber-ink)" : "var(--green)",
                      borderColor: data.salon.is_active !== false ? "var(--amber-soft)" : "var(--green-soft)"
                    }}
                    onClick={() => {
                      const nextActiveState = data.salon.is_active !== false ? false : true;
                      update({
                        ...data,
                        salon: {
                          ...data.salon,
                          is_active: nextActiveState
                        }
                      });
                      showFlash(nextActiveState ? "Salon paused (click Save to persist)" : "Salon resumed (click Save to persist)");
                    }}
                  >
                    {data.salon.is_active !== false ? "Pause" : "Resume"}
                  </button>
                }
              />
              <RowField
                label="Delete account"
                value="Permanent. This will cascade delete all salons, stylists, services, and bookings."
                action={
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: "var(--rose)", borderColor: "var(--rose-soft)" }}
                    onClick={() => {
                      setDeleteConfirmName("");
                      setShowDeleteModal(true);
                    }}
                  >
                    Delete
                  </button>
                }
              />
            </div>

            {/* Logout button */}
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={async () => {
                  showFlash("Signing out...");
                  await signOutCurrentUser();
                  router.replace("/signin");
                  router.refresh();
                }}
                className="btn btn-outline btn-sm"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--rose)",
                  borderColor: "var(--rose-soft)",
                  fontWeight: 600,
                }}
              >
                <I.logout style={{ width: 14, height: 14 }} /> Logout
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="app">
        <Header title="Settings" subtitle="LOADING SETTINGS..." />
        <main className="app-main" style={{ paddingBottom: 120 }}>
          <div className="pulse" style={{ width: "100%", height: 300, borderRadius: 12 }} />
        </main>
      </div>
    );
  }

  const modalOwnedChannel = whatsappChannels.find((channel) => channel.mode === "salon_owned");
  const modalOwnedChannelUsable = Boolean(
    modalOwnedChannel?.status === "active"
    && modalOwnedChannel.credit_line_status === "active"
    && modalOwnedChannel.phone_number_id
  );

  return (
    <div className="app settings-app animate-fade-in">
      <Header title="Settings" subtitle="CONFIGURE YOUR SALON" />

      <main className="app-main set-main">
        {/* Sticky save bar relocated above settings tabs */}
        {dirty && (
          <div className="mb-6 bg-ink text-white rounded-xl p-[14px_18px] flex justify-between items-center gap-4 shadow-[0_4px_12px_rgba(0,0,0,0.15)] animate-pop">
            <div className="text-[13px] font-medium">You have unsaved changes.</div>
            <div className="flex gap-2">
              <button className="btn btn-ghost text-white/70 hover:bg-white/8 hover:text-white" style={{ cursor: "pointer" }} onClick={discard}>Discard</button>
              <button className="btn btn-primary" style={{ cursor: "pointer" }} onClick={handleSave}>Save changes</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-[240px_1fr] gap-7 items-start max-[860px]:grid-cols-1">
          {/* Sidebar tabs */}
          <aside className="flex flex-col gap-0.5 bg-white border border-line rounded-xl p-2 sticky top-[100px] max-[860px]:flex-row max-[860px]:overflow-x-auto max-[860px]:static max-[860px]:flex-nowrap max-[860px]:p-1.5 max-[860px]:gap-1 max-[860px]:[&::-webkit-scrollbar]:hidden">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`flex items-center gap-2.5 py-2.5 px-3 border-0 rounded-lg font-inherit text-[13px] cursor-pointer text-left transition-colors duration-150 max-[860px]:shrink-0 max-[860px]:py-2 max-[860px]:px-3 ${
                    active
                      ? "bg-teal-soft text-teal-ink font-semibold"
                      : "bg-transparent text-ink-2 hover:bg-bg-2 hover:text-ink"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className={`w-7 h-7 rounded-[7px] grid place-items-center shrink-0 max-[860px]:hidden ${
                    active ? "bg-teal text-white" : "bg-bg-2 text-ink-2"
                  }`}>
                    <Icon style={{ width: 16, height: 16 }} />
                  </span>
                  {tab.label}
                  <I.chevR className="ml-auto text-ink-4 w-3.5 h-3.5 max-[860px]:hidden" />
                </button>
              );
            })}
          </aside>

          {/* Active Panel Content */}
          <div className="min-w-0">
            {renderTabContent()}
          </div>
        </div>
      </main>

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {showDeleteModal && (
        <Modal
          title="Delete Salon Account"
          onClose={() => setShowDeleteModal(false)}
          width="min(450px, 100%)"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>Cancel</button>
              <button
                className="btn"
                style={{ background: "var(--rose)", color: "#fff", border: 0 }}
                onClick={async () => {
                  if (deleteConfirmName.trim() !== data.salon.name) return;
                  setIsDeleting(true);
                  try {
                    const supabase = getSupabaseBrowserClient();
                    if (supabase && supabaseOrgId) {
                      const { error } = await supabase
                        .from("organizations")
                        .delete()
                        .eq("id", supabaseOrgId);
                      if (error) throw error;
                      
                      showFlash("Account deleted successfully");
                      await signOutCurrentUser();
                      router.replace("/signin");
                      router.refresh();
                    }
                  } catch (err) {
                    console.error("Error deleting account:", err);
                    showFlash("Failed to delete account.", 2500);
                  } finally {
                    setIsDeleting(false);
                    setShowDeleteModal(false);
                  }
                }}
                disabled={deleteConfirmName.trim() !== data.salon.name || isDeleting}
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </>
          }
        >
          <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 16 }}>
            <span style={{ fontWeight: 600, color: "var(--rose)" }}>WARNING:</span> This action is permanent and cannot be undone. Deleting this account will instantly purge the salon, stylists, services, customer list, and all booking histories.
          </div>
          <FormField label={`To confirm, type your salon name: "${data.salon.name}"`}>
            <input
              placeholder="Type salon name to confirm"
              value={deleteConfirmName}
              onChange={e => setDeleteConfirmName(e.target.value)}
              autoFocus
              style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, width: "100%" }}
            />
          </FormField>
        </Modal>
      )}

      {/* Save Success Alert */}
      {saved && (
        <div
          style={{
            position: "fixed",
            bottom: 96,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--green)",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 13,
            zIndex: 60,
            boxShadow: "0 12px 24px -10px rgba(0,0,0,0.3)",
          }}
        >
          ✓ Changes saved successfully
        </div>
      )}

      {/* SERVICE / COMBO MODAL */}
      {serviceModal && (
        <ServiceMenuModal
          modal={serviceModal}
          allServices={data.services}
          onClose={() => setServiceModal(null)}
          onSave={saveServiceMenuItem}
          onDelete={deleteServiceMenuItem}
        />
      )}

      {/* STYLIST MODAL (ADD & EDIT) */}
      {showStylistModal && (
        <Modal
          title={editingStylist ? "Edit stylist" : "Add new stylist"}
          onClose={() => setShowStylistModal(false)}
          width="min(540px, 100%)"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowStylistModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveStylist} disabled={!stylistName.trim()}>
                {editingStylist ? "Save changes" : "Add stylist"}
              </button>
            </>
          }
        >
          <FormField label="Full name">
            <input
              placeholder="e.g. Anjali Sharma"
              value={stylistName}
              onChange={e => setStylistName(e.target.value)}
              autoFocus
              style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, width: "100%" }}
            />
          </FormField>
          <FormField label="Account email (optional)" className="mt-3">
            <input
              type="email"
              placeholder="anjali@salon.com"
              value={stylistEmail}
              onChange={e => setStylistEmail(e.target.value)}
              className="w-full h-[42px] px-3 rounded-lg border border-line-2 bg-white text-sm outline-none focus:border-teal"
            />
            <div className="text-[11px] text-ink-3 mt-1.5">
              Leave empty for schedule-only stylists. Add an email only when this stylist needs their own login.
            </div>
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <FormField label="Role / subtitle">
              <input
                placeholder="Senior stylist · 5 yrs"
                value={stylistRole}
                onChange={e => setStylistRole(e.target.value)}
                style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, width: "100%" }}
              />
            </FormField>
            <FormField label="Commission %">
              <input
                type="number"
                value={stylistCommission}
                onChange={e => setStylistCommission(parseInt(e.target.value) || 0)}
                min={0}
                max={100}
                style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, width: "100%" }}
              />
            </FormField>
          </div>
        </Modal>
      )}

      {/* WHATSAPP SENDER SWITCH MODAL */}
      {showWaSenderSwitchModal && (
        <Modal
          title="WhatsApp number connected"
          onClose={() => setShowWaSenderSwitchModal(false)}
          width="min(460px, 100%)"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => void saveWhatsAppSenderPreference("chairbook")} disabled={waSenderSaving}>
                Keep ChairBook
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void saveWhatsAppSenderPreference("salon_owned")}
                disabled={!modalOwnedChannelUsable || waSenderSaving}
              >
                Switch to my number
              </button>
            </>
          }
        >
          <div className="text-sm text-ink-2 leading-relaxed">
            ChairBook WhatsApp remains the default sender. Customers will see ChairBook as the WhatsApp profile, with your salon name inside each message.
          </div>
          <div className="text-sm text-ink-2 leading-relaxed mt-3">
            {modalOwnedChannelUsable
              ? "Your WhatsApp Business number is active, so you can switch now or change it later from this page."
              : "Your WhatsApp Business number was saved, but it needs active channel and credit line status before it can become the sender."}
          </div>
        </Modal>
      )}

      {/* WHATSAPP CHANGE NUMBER MODAL */}
      {showWaModal && (
        <Modal
          title="Change WhatsApp number"
          onClose={() => setShowWaModal(false)}
          width="min(400px, 100%)"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowWaModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveWaNumber} disabled={!waNumberInput.trim()}>
                Update
              </button>
            </>
          }
        >
          <FormField label="Business number">
            <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--line-2)", borderRadius: 8, overflow: "hidden" }}>
              <span style={{ padding: "10px 12px", background: "var(--bg-2)", borderRight: "1px solid var(--line-2)", fontSize: 14, color: "var(--ink-3)", fontWeight: 500, userSelect: "none" }}>
                +91
              </span>
              <input
                placeholder="98765 43210"
                value={waNumberInput}
                onChange={e => setWaNumberInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                autoFocus
                style={{ padding: "10px 12px", border: 0, outline: 0, fontSize: 14, width: "100%", flex: 1 }}
              />
            </div>
          </FormField>
        </Modal>
      )}

      {/* EDIT MESSAGE TEMPLATE MODAL */}
      {editingTemplateKey && (
        <Modal
          title="Edit message template"
          onClose={() => setEditingTemplateKey(null)}
          width="min(500px, 100%)"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setEditingTemplateKey(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveTemplate}>
                Save template
              </button>
            </>
          }
        >
          <FormField label="Template text">
            <textarea
              rows={4}
              value={templateText}
              onChange={e => setTemplateText(e.target.value)}
              style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 13, width: "100%", fontFamily: "monospace", resize: "vertical" }}
            />
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.4 }}>
              Use placeholders: <code>{`{name}`}</code>, <code>{`{date}`}</code>, <code>{`{time}`}</code>, <code>{`{stylist}`}</code>, <code>{`{service}`}</code>.
            </div>
          </FormField>
        </Modal>
      )}


    </div>
  );
}
