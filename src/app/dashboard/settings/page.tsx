"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { signOutCurrentUser } from "@/lib/auth-session";
import Header from "@/components/layout/Header";
import { Icons as I, Modal, FormField, Avatar, Badge, PhoneInput } from "@/components/ui";
import { useProfile } from "@/context/ProfileContext";
import { useToast } from "@/context/ToastContext";

import { Service, Stylist, SettingsData, WhatsAppTemplates, DbSalon, DbServiceRow, DbStylistRow, BillingInvoice } from "@/types";

import { DAYS, TABS, PLANS, INITIAL_DATA } from "@/constants/settings";

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

  // Service Modals state
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingSvc, setEditingSvc] = useState<Service | null>(null);
  const [svcName, setSvcName] = useState("");
  const [svcCategory, setSvcCategory] = useState("Hair");
  const [svcDuration, setSvcDuration] = useState(30);
  const [svcPrice, setSvcPrice] = useState(500);

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

  // Dynamic Invoices and Delete Modal state
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
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

        let salonName = "GLOW SALON";
        let salonArea = "ANDHERI";
        let salonCity = "MUMBAI";
        let salonType = "Unisex salon";
        const salonHours = INITIAL_DATA.hours;
        let salonWa = INITIAL_DATA.wa.number;
        let orgPlan = INITIAL_DATA.plan;
        let salonTimezone = "Asia/Kolkata";
        let salonCurrency = "INR";
        let salonLanguage = "en";
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
            .select("id, name, area, city, type, hours, wa_number, timezone, currency, language, wa_settings, notification_settings, is_active, photos")
            .eq("org_id", userProfile.org_id)
            .eq("is_primary", true)
            .maybeSingle();

          selectedSalon = salon as unknown as DbSalon | null;
          if (!selectedSalon) {
            const { data: firstSalon } = await supabase
              .from("salons")
              .select("id, name, area, city, type, hours, wa_number, timezone, currency, language, wa_settings, notification_settings, is_active, photos")
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
            salonIsActive = selectedSalon.is_active !== false;
            salonPhotos = selectedSalon.photos || [];
            if (selectedSalon.wa_settings) {
              salonWaSettings = {
                ...INITIAL_DATA.wa,
                ...selectedSalon.wa_settings,
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

        // Load services and team from DB
        let dbServices = INITIAL_DATA.services;
        let dbTeam = INITIAL_DATA.team;

        const currentSalonId = selectedSalon?.id;
        if (currentSalonId) {
          try {
            const { data: svcData } = await supabase
              .from("services")
              .select("id, name, category, duration_min, price, active")
              .eq("salon_id", currentSalonId);

            if (svcData && svcData.length > 0) {
              dbServices = (svcData as unknown as DbServiceRow[]).map((s) => ({
                id: s.id,
                name: s.name,
                cat: s.category || "General",
                duration: s.duration_min,
                price: Number(s.price),
                active: s.active,
              }));
            }

            const { data: teamData } = await supabase
              .from("stylists")
              .select("id, name, role_label, tone, commission_pct, active, email, user_id, specialisations, photo_url, booking_slug, account_invited_at, account_accepted_at")
              .eq("salon_id", currentSalonId);

            if (teamData && teamData.length > 0) {
              dbTeam = (teamData as unknown as DbStylistRow[]).map((s) => ({
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
            }
          } catch (err) {
            console.error("Error loading services/team:", err);
          }
        }

        // Load Billing Invoices
        let dbInvoices: BillingInvoice[] = [];
        if (userProfile.org_id) {
          const { data: invoicesData } = await supabase
            .from("billing_invoices")
            .select("id, date, plan_name, amount, payment_method")
            .eq("org_id", userProfile.org_id)
            .order("date", { ascending: false });
          if (invoicesData && invoicesData.length > 0) {
            dbInvoices = invoicesData.map((inv) => {
              let formattedDate = inv.date;
              try {
                formattedDate = new Date(inv.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                });
              } catch {}
              return {
                id: inv.id,
                date: formattedDate,
                plan_name: inv.plan_name,
                amount: Number(inv.amount),
                payment_method: inv.payment_method
              };
            });
          }
        }
        setInvoices(dbInvoices);

        setData({
          salon: {
            name: salonName,
            area: salonArea,
            city: salonCity,
            type: salonType,
            timezone: salonTimezone,
            currency: salonCurrency,
            language: salonLanguage,
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
          }
        });

      } catch (err) {
        console.error("Error loading settings from Supabase:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const update = (next: SettingsData) => {
    setData(next);
    setDirty(true);
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
              is_active: data.salon.is_active !== false,
              wa_settings: {
                reminder: data.wa.reminder,
                autoConfirm: data.wa.autoConfirm,
                sendOffers: data.wa.sendOffers,
                verified: data.wa.verified ?? true,
                templates: data.wa.templates
              },
              notification_settings: data.notifs,
              photos: data.salon.photos || []
            })
            .eq("id", supabaseSalonId);
          if (salonError) throw salonError;

          // 2. Delete removed services
          const { data: dbServicesList } = await supabase
            .from("services")
            .select("id")
            .eq("salon_id", supabaseSalonId);
          const dbSvcIds = dbServicesList?.map(s => s.id) || [];
          const currentSvcIds = data.services.map(s => s.id);
          const svcIdsToDelete = dbSvcIds.filter(id => typeof id === "string" && !currentSvcIds.includes(id));
          if (svcIdsToDelete.length > 0) {
            const { error: svcDeleteErr } = await supabase
              .from("services")
              .delete()
              .in("id", svcIdsToDelete);
            if (svcDeleteErr) throw svcDeleteErr;
          }

          // 3. Save services
          for (const svc of data.services) {
            const svcPayload: {
              salon_id: string;
              name: string;
              category: string;
              duration_min: number;
              price: number;
              active: boolean;
              id?: string;
            } = {
              salon_id: supabaseSalonId,
              name: svc.name,
              category: svc.cat || "General",
              duration_min: svc.duration,
              price: svc.price,
              active: svc.active ?? true,
            };
            if (typeof svc.id === "string" && !svc.id.startsWith("temp-")) {
              svcPayload.id = svc.id;
            }
            await supabase
              .from("services")
              .upsert(svcPayload, { onConflict: "id" });
          }

          // 4. Delete removed stylists
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

              // Reload invoices list
              const { data: invoicesData } = await supabase
                .from("billing_invoices")
                .select("id, date, plan_name, amount, payment_method")
                .eq("org_id", supabaseOrgId)
                .order("date", { ascending: false });
              if (invoicesData) {
                setInvoices(invoicesData.map(inv => {
                  let formattedDate = inv.date;
                  try {
                    formattedDate = new Date(inv.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    });
                  } catch {}
                  return {
                    id: inv.id,
                    date: formattedDate,
                    plan_name: inv.plan_name,
                    amount: Number(inv.amount),
                    payment_method: inv.payment_method
                  };
                }));
              }
            }
          }

          // 7. Save extra config to LocalStorage
          localStorage.setItem("cb_settings_wa_" + supabaseSalonId, JSON.stringify(data.wa));
          localStorage.setItem("cb_settings_notifs_" + supabaseSalonId, JSON.stringify(data.notifs));

          // 8. Re-fetch services and team to update UI IDs
          const { data: freshSvcs } = await supabase
            .from("services")
            .select("id, name, category, duration_min, price, active")
            .eq("salon_id", supabaseSalonId);

          const { data: freshTeam } = await supabase
            .from("stylists")
            .select("id, name, role_label, tone, commission_pct, active, email, user_id, specialisations, photo_url, booking_slug, account_invited_at, account_accepted_at")
            .eq("salon_id", supabaseSalonId);

          setData(prev => ({
            ...prev,
            services: freshSvcs ? (freshSvcs as unknown as DbServiceRow[]).map((s) => ({
              id: s.id,
              name: s.name,
              cat: s.category || "General",
              duration: s.duration_min,
              price: Number(s.price),
              active: s.active,
            })) : prev.services,
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
        console.error("Error saving settings to Supabase:", err);
        showFlash("Failed to save changes.", 2500);
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
  const openAddService = () => {
    setEditingSvc(null);
    setSvcName("");
    setSvcCategory("Hair");
    setSvcDuration(30);
    setSvcPrice(300);
    setShowServiceModal(true);
  };

  const openEditService = (svc: Service) => {
    setEditingSvc(svc);
    setSvcName(svc.name);
    setSvcCategory(svc.cat || "Hair");
    setSvcDuration(svc.duration);
    setSvcPrice(svc.price);
    setShowServiceModal(true);
  };

  const saveService = () => {
    if (!svcName.trim()) return;
    if (editingSvc) {
      // Edit mode
      const list = data.services.map(s => s.id === editingSvc.id ? {
        ...s,
        name: svcName.trim(),
        cat: svcCategory,
        duration: svcDuration,
        price: svcPrice
      } : s);
      update({ ...data, services: list });
      showFlash("Service updated");
    } else {
      // Add mode
      const newSvc: Service = {
        id: "temp-" + Date.now(),
        name: svcName.trim(),
        cat: svcCategory,
        duration: svcDuration,
        price: svcPrice,
        active: true
      };
      update({ ...data, services: [...data.services, newSvc] });
      showFlash("Service added");
    }
    setShowServiceModal(false);
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
            </div>

            <SectionHead title="Photos" desc="At least one photo helps customers trust the salon. 3:2 aspect, < 5 MB each." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="grid grid-cols-4 gap-2.5 max-[720px]:grid-cols-2">
                {(data.salon.photos || []).map((url, i) => (
                  <div key={url || i} className="relative aspect-[3/2] rounded-lg overflow-hidden border border-line group">
                    <img src={url} alt={`Salon photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
              desc={`${data.services.filter(s => s.active).length} active · ${data.services.length} total`}
              action={
                <button className="btn btn-primary btn-sm" onClick={openAddService}>
                  <I.plus style={{ width: 14, height: 14 }} /> Add service
                </button>
              }
            />
            <div className="bg-white border border-line rounded-xl p-0">
              {["Hair", "Skin", "Hands", "Nails", "General"].map(cat => {
                const items = data.services.filter(s => s.cat === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="p-[12px_20px] text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3 bg-bg border-b border-line flex gap-2">
                      {cat} <span className="text-ink-4 font-mono">{items.length}</span>
                    </div>
                    {items.map(s => (
                      <div key={s.id} className={`grid grid-cols-[1fr_auto_auto_auto] gap-3 p-[12px_20px] items-center border-b border-line last:border-b-0 max-[720px]:grid-cols-[1fr_auto] ${!s.active ? "opacity-55" : ""}`}>
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
                          onClick={() => {
                            const list = data.services.filter(item => item.id !== s.id);
                            update({ ...data, services: list });
                          }}
                        >
                          <I.trash style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
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

      case "whatsapp":
        return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead title="WhatsApp integration" desc="The number customers receive messages from." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="flex justify-between items-center gap-3.5">
                <div className="flex items-center gap-3.5">
                  <I.wa style={{ color: "var(--wa)", width: 22, height: 22 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>+91 {data.wa.number}</div>
                    <div style={{ fontSize: 12, color: "var(--green)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                      <span className="engage-dot green"></span> Verified · Active since Oct 2023
                    </div>
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={openWaChange}>Change number</button>
              </div>
            </div>

            <SectionHead title="Automations" desc="Reduce no-shows and bring people back without lifting a finger." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="flex justify-between items-center gap-4 py-3.5 border-b border-line first:pt-0 last:border-b-0 last:pb-0">
                <div>
                  <div className="text-sm font-semibold">Auto-confirm via WhatsApp</div>
                  <div className="text-xs text-ink-3 mt-0.5 max-w-[480px]">When a customer books, send them a WhatsApp confirmation immediately.</div>
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
                  <div className="text-xs text-ink-3 mt-0.5 max-w-[480px]">Customers reply YES to confirm. Studies show this cuts no-shows by 60%.</div>
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
                  <div className="text-xs text-ink-3 mt-0.5 max-w-[480px]">Allow sending offers / campaigns to your customer list. Off by default.</div>
                </div>
                <label className="inline-flex cursor-pointer items-center relative shrink-0">
                  <input
                    type="checkbox"
                    className="absolute opacity-0 pointer-events-none peer"
                    checked={data.wa.sendOffers}
                    onChange={e => update({ ...data, wa: { ...data.wa, sendOffers: e.target.checked } })}
                  />
                  <span className="w-9 h-5.5 rounded-full bg-line-2 relative transition-colors duration-150 before:content-[''] before:absolute before:left-[2px] before:top-[2px] before:w-[18px] before:h-[18px] before:rounded-full before:bg-white before:transition-transform before:duration-[180ms] before:ease-[cubic-bezier(0.2,0.9,0.3,1.2)] before:shadow-[0_1px_2px_rgba(0,0,0,0.1)] peer-checked:bg-teal peer-checked:before:translate-x-[14px]"></span>
                </label>
              </div>
            </div>

            <SectionHead title="Message templates" desc="Edit what your customers see. Variables like {name} are replaced automatically." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="flex gap-3.5 py-3 border-b border-line items-start first:pt-0 last:border-b-0 last:pb-0">
                <div className="flex-1">
                  <div className="text-[13px] font-semibold">Booking confirmation</div>
                  <div className="text-xs text-ink-3 mt-1 bg-bg-2 p-[8px_10px] rounded-lg font-mono leading-[1.45]">{data.wa.templates?.confirmation}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => openEditTemplate("confirmation")}>
                  <I.edit style={{ marginRight: 4 }} /> Edit
                </button>
              </div>
              <div className="flex gap-3.5 py-3 border-b border-line items-start first:pt-0 last:border-b-0 last:pb-0">
                <div className="flex-1">
                  <div className="text-[13px] font-semibold">Reminder</div>
                  <div className="text-xs text-ink-3 mt-1 bg-bg-2 p-[8px_10px] rounded-lg font-mono leading-[1.45]">{data.wa.templates?.reminder}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => openEditTemplate("reminder")}>
                  <I.edit style={{ marginRight: 4 }} /> Edit
                </button>
              </div>
              <div className="flex gap-3.5 py-3 border-b border-line items-start first:pt-0 last:border-b-0 last:pb-0">
                <div className="flex-1">
                  <div className="text-[13px] font-semibold">Re-engagement</div>
                  <div className="text-xs text-ink-3 mt-1 bg-bg-2 p-[8px_10px] rounded-lg font-mono leading-[1.45]">{data.wa.templates?.reengagement}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => openEditTemplate("reengagement")}>
                  <I.edit style={{ marginRight: 4 }} /> Edit
                </button>
              </div>
            </div>
          </div>
        );

      case "plan":
        const current = PLANS.find(p => p.id === data.plan) || PLANS[1];
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
            <div className="bg-white border border-line rounded-xl p-0">
              {invoices.length > 0 ? (
                invoices.map((b, i) => (
                  <div key={b.id || i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-3.5 p-[14px_20px] items-center border-b border-line last:border-b-0 max-[720px]:grid-cols-[1fr_auto]">
                    <div>
                      <div className="text-[13px] font-semibold mono">{b.date}</div>
                      <div className="text-xs text-ink-3 mt-0.5">{b.plan_name}</div>
                    </div>
                    <div className="text-xs text-ink-3 max-[720px]:col-span-full">{b.payment_method}</div>
                    <div className="text-sm font-semibold font-mono">₹{b.amount.toLocaleString("en-IN")}</div>
                    <button className="btn btn-ghost btn-sm max-[720px]:col-start-2" onClick={() => showFlash("Downloading receipt...")}>Receipt</button>
                  </div>
                ))
              ) : (
                <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)", fontSize: 13, fontStyle: "italic" }}>
                  No billing history available.
                </div>
              )}
            </div>
          </div>
        );

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

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link className="bn-item" href="/dashboard"><I.home /><span>Home</span></Link>
        <Link className="bn-item" href="/dashboard/bookings"><I.calendar /><span>Bookings</span></Link>
        <Link className="bn-item" href="/dashboard/customers"><I.users /><span>Customers</span></Link>
        <Link className="bn-item" href="/dashboard/insights"><I.chart /><span>Insights</span></Link>
        <Link className="bn-item active" href="/dashboard/settings"><I.settings /><span>Settings</span></Link>
      </nav>

      {/* SERVICE MODAL (ADD & EDIT) */}
      {showServiceModal && (
        <Modal
          title={editingSvc ? "Edit service" : "Add new service"}
          onClose={() => setShowServiceModal(false)}
          width="min(540px, 100%)"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowServiceModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveService} disabled={!svcName.trim()}>
                {editingSvc ? "Save changes" : "Add service"}
              </button>
            </>
          }
        >
          <FormField label="Service name">
            <input
              placeholder="e.g. Hair Color"
              value={svcName}
              onChange={e => setSvcName(e.target.value)}
              autoFocus
              style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, width: "100%" }}
            />
          </FormField>
          <FormField label="Category" style={{ marginTop: 12 }}>
            <select
              value={svcCategory}
              onChange={e => setSvcCategory(e.target.value)}
              style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, width: "100%", background: "#fff" }}
            >
              <option value="Hair">Hair</option>
              <option value="Skin">Skin</option>
              <option value="Hands">Hands</option>
              <option value="Nails">Nails</option>
              <option value="General">General</option>
            </select>
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <FormField label="Duration (min)">
              <input
                type="number"
                value={svcDuration}
                onChange={e => setSvcDuration(parseInt(e.target.value) || 30)}
                style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, width: "100%" }}
              />
            </FormField>
            <FormField label="Price (₹)">
              <input
                type="number"
                value={svcPrice}
                onChange={e => setSvcPrice(parseInt(e.target.value) || 0)}
                style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, width: "100%" }}
              />
            </FormField>
          </div>
        </Modal>
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
