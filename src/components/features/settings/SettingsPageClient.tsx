"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { GST_SCHEMA_MISSING_MESSAGE, getSupabaseErrorMessage, isMissingGstSchemaError } from "@/lib/supabase-errors";
import { GST_SETTINGS_SELECT } from "@/lib/supabase-selects";
import { signOutCurrentUser } from "@/lib/auth-session";
import { isUUID } from "@/lib/utils";
import { findDuplicateServiceCode, findNextServiceCode, formatServiceCode } from "@/lib/service-codes";
import { SERVICE_SELECT_WITH_BUNDLES, mapServiceWithBundleDetails } from "@/lib/service-bundles";
import { loadFacebookSdk } from "@/lib/facebook-sdk";
import { loadRazorpayCheckout } from "@/lib/razorpay";
import {
  buildWhatsAppSettingsPayload,
  readWhatsAppSenderPreference,
  withWhatsAppSenderPreference,
} from "@/lib/settings-helpers";
import Header from "@/components/layout/Header";
import { Icons as I, Modal, FormField } from "@/components/ui";
import { useProfile } from "@/context/ProfileContext";
import { useToast } from "@/context/ToastContext";
import { useBillingInvoices, useGstInvoices } from "@/hooks";

import {
  Service,
  ServiceKind,
  Stylist,
  SettingsData,
  WhatsAppTemplates,
  WhatsAppSenderPreference,
  DbSalon,
  DbServiceRaw,
  DbStylistRow,
  SalonGstSettings,
  DEFAULT_GST_SETTINGS,
  ServiceModalState,
  WhatsAppChannelView,
  MessageCreditTopupView,
  MessageCreditLedgerView,
  WhatsAppTemplateView,
  WhatsAppConnectConfig,
  PendingEmbeddedSignup,
} from "@/types";

import { TABS, INITIAL_DATA } from "@/constants/settings";
import { normalizeBookingWindowDays } from "@/lib/booking-window";
import { WHATSAPP_CREDIT_PACKS } from "@/lib/whatsapp/credit-packs";
import { buildBookingConfirmationPayload } from "@/lib/whatsapp/message-payloads";
import { sendWhatsAppTemplateFromClient } from "@/lib/whatsapp-client";
import type { MessageCreditWalletRow } from "@/lib/whatsapp/wallet-view";
import {
  extractEmbeddedSignupCode,
  parseEmbeddedSignupMessage,
} from "@/lib/whatsapp/embedded-signup";

const ServiceMenuModal = dynamic(() => import("@/components/features/settings/ServiceMenuModal"), {
  loading: () => null,
});

const SalonTab = React.lazy(() => import("@/components/features/settings/SalonTab"));
const ServicesTab = React.lazy(() => import("@/components/features/settings/ServicesTab"));
const TeamTab = React.lazy(() => import("@/components/features/settings/TeamTab"));
const WhatsAppTab = React.lazy(() => import("@/components/features/settings/WhatsAppTab"));
const PlanTab = React.lazy(() => import("@/components/features/settings/PlanTab"));
const GstTab = React.lazy(() => import("@/components/features/settings/GstTab"));
const NotificationsTab = React.lazy(() => import("@/components/features/settings/NotificationsTab"));
const AttendanceTab = React.lazy(() => import("@/components/features/settings/AttendanceTab"));
const AccountTab = React.lazy(() => import("@/components/features/settings/AccountTab"));

const SERVICE_CATEGORIES = ["Hair", "Skin", "Hands", "Nails", "General"];
const getServiceKind = (service: Service): ServiceKind => service.kind || "service";
const getComponentIds = (service: Service) => service.componentIds || service.items || [];

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-[18px]" aria-busy="true">
      <div className="h-11 rounded-xl bg-bg-2 animate-pulse" />
      <div className="h-[220px] rounded-xl bg-bg-2 animate-pulse" />
      <div className="h-[140px] rounded-xl bg-bg-2 animate-pulse" />
    </div>
  );
}

// ===== MAIN PAGE COMPONENT =====
export default function SettingsPageClient() {
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

    const controller = new AbortController();

    const loadSettings = async () => {
      try {
        setLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (controller.signal.aborted) return;
        if (!session?.user) {
          if (!controller.signal.aborted) setLoading(false);
          return;
        }

        setSupabaseUserId(session.user.id);

        const { data: userProfile } = await supabase
          .from("users")
          .select("name, email, role, phone, org_id")
          .eq("id", session.user.id)
          .abortSignal(controller.signal)
          .maybeSingle();

        if (controller.signal.aborted) return;
        if (!userProfile) {
          if (!controller.signal.aborted) setLoading(false);
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
            .abortSignal(controller.signal)
            .maybeSingle();
          if (controller.signal.aborted) return;
          if (org?.plan) orgPlan = org.plan.toLowerCase();

          const { data: salon } = await supabase
            .from("salons")
            .select("id, name, area, city, type, hours, wa_number, timezone, currency, language, booking_window_days, wa_settings, notification_settings, is_active, photos")
            .eq("org_id", userProfile.org_id)
            .eq("is_primary", true)
            .abortSignal(controller.signal)
            .maybeSingle();

          if (controller.signal.aborted) return;
          selectedSalon = salon as unknown as DbSalon | null;
          if (!selectedSalon) {
            const { data: firstSalon } = await supabase
              .from("salons")
              .select("id, name, area, city, type, hours, wa_number, timezone, currency, language, booking_window_days, wa_settings, notification_settings, is_active, photos")
              .eq("org_id", userProfile.org_id)
              .limit(1)
              .abortSignal(controller.signal)
              .maybeSingle();
            if (controller.signal.aborted) return;
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
              .is("deleted_at", null)
              .abortSignal(controller.signal);
            if (controller.signal.aborted) return;
            if (svcError) throw svcError;

            dbServices = ((svcData || []) as unknown as DbServiceRaw[]).map(mapServiceWithBundleDetails);

            const { data: teamData, error: teamError } = await supabase
              .from("stylists")
              .select("id, name, role_label, tone, commission_pct, active, email, user_id, specialisations, photo_url, booking_slug, account_invited_at, account_accepted_at")
              .eq("salon_id", currentSalonId)
              .abortSignal(controller.signal);
            if (controller.signal.aborted) return;
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
              .select(GST_SETTINGS_SELECT)
              .eq("salon_id", currentSalonId)
              .abortSignal(controller.signal)
              .maybeSingle();

            if (controller.signal.aborted) return;
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
                .order("mode", { ascending: false })
                .abortSignal(controller.signal),
              supabase
                .from("message_credit_wallets")
                .select("plan_credits,refill_credits,reserved_plan_credits,reserved_refill_credits,reset_period_start,reset_period_end")
                .eq("salon_id", currentSalonId)
                .abortSignal(controller.signal)
                .maybeSingle(),
              supabase
                .from("message_credit_topups")
                .select("id,razorpay_order_id,credits,amount_paise,status,created_at")
                .eq("salon_id", currentSalonId)
                .order("created_at", { ascending: false })
                .limit(5)
                .abortSignal(controller.signal),
              supabase
                .from("message_credit_ledger")
                .select("id,action,plan_credits,refill_credits,created_at")
                .eq("salon_id", currentSalonId)
                .order("created_at", { ascending: false })
                .limit(8)
                .abortSignal(controller.signal),
              supabase
                .from("whatsapp_message_templates")
                .select("id,template_key,template_name:meta_template_name,category,language_code,status")
                .or(`salon_id.eq.${currentSalonId},salon_id.is.null`)
                .order("template_key")
                .abortSignal(controller.signal),
            ]);

            if (controller.signal.aborted) return;
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
          if (controller.signal.aborted) return;
          setWhatsappChannels([]);
          setMessageWallet(null);
          setCreditTopups([]);
          setCreditLedger([]);
          setWhatsappTemplates([]);
        }

        if (controller.signal.aborted) return;
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
        if (controller.signal.aborted) return;
        console.error("Error loading settings from Supabase:", err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadSettings();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadConnectConfig = async () => {
      try {
        const response = await fetch("/api/whatsapp/connect/config", { signal: controller.signal });
        const body = await response.json().catch(() => null);
        if (controller.signal.aborted) return;

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
        if (!controller.signal.aborted) {
          setWaConnectConfig((current) => ({
            ...current,
            loading: false,
            configured: false,
          }));
        }
      }
    };

    void loadConnectConfig();
    return () => controller.abort();
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
            services: freshSvcs ? (freshSvcs as unknown as DbServiceRaw[]).map(mapServiceWithBundleDetails) : prev.services,
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
  const renderLazyTab = (content: React.ReactNode) => (
    <React.Suspense fallback={<TabSkeleton />}>
      {content}
    </React.Suspense>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "salon":
        return renderLazyTab(
          <SalonTab
            data={data}
            update={update}
            deletePhoto={deletePhoto}
            handlePhotoUpload={handlePhotoUpload}
          />
        );
      case "services":
        return renderLazyTab(
          <ServicesTab
            data={data}
            update={update}
            qServices={qServices}
            serviceResultCount={serviceResultCount}
            serviceSearch={serviceSearch}
            setServiceSearch={setServiceSearch}
            totalActiveMenuItems={totalActiveMenuItems}
            totalMenuItems={totalMenuItems}
            bundleServices={bundleServices}
            filteredNormalServices={filteredNormalServices}
            filteredBundleServices={filteredBundleServices}
            serviceCategories={serviceCategories}
            serviceById={serviceById}
            getComponentIds={getComponentIds}
            openAddService={openAddService}
            openEditService={openEditService}
            deleteServiceMenuItem={deleteServiceMenuItem}
          />
        );
      case "team":
        return renderLazyTab(
          <TeamTab
            data={data}
            update={update}
            openAddStylist={openAddStylist}
            openEditStylist={openEditStylist}
            inviteStylistAccount={inviteStylistAccount}
            invitingStylistId={invitingStylistId}
          />
        );
      case "whatsapp":
        return renderLazyTab(
          <WhatsAppTab
            data={data}
            update={update}
            whatsappChannels={whatsappChannels}
            whatsappTemplates={whatsappTemplates}
            messageWallet={messageWallet}
            waConnectConfig={waConnectConfig}
            waConnectBusy={waConnectBusy}
            waConnectStatus={waConnectStatus}
            waSenderSaving={waSenderSaving}
            waTestPhone={waTestPhone}
            setWaTestPhone={setWaTestPhone}
            waTestSending={waTestSending}
            startWhatsAppConnect={startWhatsAppConnect}
            openWaChange={openWaChange}
            saveWhatsAppSenderPreference={saveWhatsAppSenderPreference}
            sendWhatsAppTestMessage={sendWhatsAppTestMessage}
            openEditTemplate={openEditTemplate}
          />
        );
      case "plan":
        return renderLazyTab(
          <PlanTab
            data={data}
            update={update}
            messageWallet={messageWallet}
            creditRefilling={creditRefilling}
            startCreditRefill={startCreditRefill}
            creditLedger={creditLedger}
            creditTopups={creditTopups}
            billingInvoiceList={billingInvoiceList}
            showFlash={showFlash}
          />
        );
      case "gst":
        return renderLazyTab(
          <GstTab
            data={data}
            update={update}
            gstInvoiceList={gstInvoiceList}
          />
        );
      case "notifs":
        return renderLazyTab(<NotificationsTab data={data} update={update} />);
      case "attendance":
        return renderLazyTab(<AttendanceTab salonId={supabaseSalonId} />);
      case "account":
        return renderLazyTab(
          <AccountTab
            data={data}
            update={update}
            showFlash={showFlash}
            setDeleteConfirmName={setDeleteConfirmName}
            setShowDeleteModal={setShowDeleteModal}
          />
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
