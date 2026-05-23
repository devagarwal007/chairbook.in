"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import { Icons as I } from "@/components/ui/Icons";
import { useProfile } from "@/context/ProfileContext";

import { HoursData, Service, Stylist, SettingsData, WhatsAppTemplates } from "@/types";

// ===== CONSTANTS =====
const DAYS = [
  { id: "mon", name: "Monday" },
  { id: "tue", name: "Tuesday" },
  { id: "wed", name: "Wednesday" },
  { id: "thu", name: "Thursday" },
  { id: "fri", name: "Friday" },
  { id: "sat", name: "Saturday" },
  { id: "sun", name: "Sunday" },
];

const TABS = [
  { id: "salon",    label: "Salon profile", icon: I.store },
  { id: "services", label: "Services",      icon: I.scissors },
  { id: "team",     label: "Team",          icon: I.team },
  { id: "whatsapp", label: "WhatsApp",      icon: I.wa },
  { id: "plan",     label: "Subscription",  icon: I.card },
  { id: "notifs",   label: "Notifications", icon: I.bell },
  { id: "account",  label: "Account",       icon: I.user },
];

const PLANS = [
  { id: "solo",  name: "Solo",  price: 499,  desc: "For independent stylists" },
  { id: "salon", name: "Salon", price: 999,  desc: "Up to 5 stylists" },
  { id: "chain", name: "Chain", price: 2499, desc: "Multi-branch" },
];

const INITIAL_DATA: SettingsData = {
  account: { name: "Ravi Varma", email: "ravi@glowsalon.in" },
  salon: { name: "Glow Salon & Spa", area: "Andheri West, near Lokhandwala", type: "Unisex salon", city: "Mumbai" },
  hours: {
    mon: { open: true,  from: "10:00", to: "20:00" },
    tue: { open: true,  from: "10:00", to: "20:00" },
    wed: { open: true,  from: "10:00", to: "20:00" },
    thu: { open: true,  from: "10:00", to: "20:00" },
    fri: { open: true,  from: "10:00", to: "21:00" },
    sat: { open: true,  from: "09:00", to: "21:00" },
    sun: { open: false, from: "10:00", to: "18:00" },
  },
  services: [
    { id: 1, name: "Haircut",       cat: "Hair",  duration: 30, price: 300,  active: true },
    { id: 2, name: "Hair Color",    cat: "Hair",  duration: 90, price: 1800, active: true },
    { id: 3, name: "Hair Spa",      cat: "Hair",  duration: 60, price: 900,  active: true },
    { id: 4, name: "Facial — Gold", cat: "Skin",  duration: 75, price: 1400, active: true },
    { id: 5, name: "Threading",     cat: "Skin",  duration: 15, price: 80,   active: true },
    { id: 6, name: "Manicure",      cat: "Hands", duration: 30, price: 350,  active: true },
    { id: 7, name: "Pedicure",      cat: "Hands", duration: 45, price: 500,  active: false },
  ],
  team: [
    { id: 1, name: "Anjali", role: "Senior stylist · 9 yrs",     tone: "b", commission: 30 },
    { id: 2, name: "Pooja",  role: "Beautician · Skin specialist", tone: "d", commission: 25 },
    { id: 3, name: "Kiran",  role: "Senior stylist · 12 yrs",    tone: "c", commission: 35 },
    { id: 4, name: "Rekha",  role: "Threading & nails · 4 yrs",  tone: "e", commission: 25 },
  ],
  wa: {
    number: "98xxx 12345",
    verified: true,
    reminder: 24,
    autoConfirm: true,
    sendOffers: false,
    templates: {
      confirmation: "Hi {name} 🙏 Your booking at Glow Salon is confirmed for {date} at {time} with {stylist}.",
      reminder: "Hi {name}, reminder: {service} with {stylist} tomorrow at {time}. Reply YES to confirm.",
      reengagement: "Hey {name}! It's been a while. Book now and get 10% off your next visit."
    }
  },
  plan: "salon",
  notifs: {
    newBooking: { push: true,  sms: false, wa: true },
    cancel:     { push: true,  sms: false, wa: true },
    noshow:     { push: true,  sms: false, wa: false },
    daily:      { push: false, sms: false, wa: true },
  },
};

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
  const [flash, setFlash] = useState<string | null>(null);
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

  // WhatsApp Change Number modal
  const [showWaModal, setShowWaModal] = useState(false);
  const [waNumberInput, setWaNumberInput] = useState("");

  // Edit Message Template modal
  const [editingTemplateKey, setEditingTemplateKey] = useState<keyof WhatsAppTemplates | null>(null);
  const [templateText, setTemplateText] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
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
          .select("name, email, role, org_id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!userProfile) {
          setLoading(false);
          return;
        }

        setSupabaseOrgId(userProfile.org_id);

        const userName = userProfile.name || session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Owner";
        const userEmail = userProfile.email || session.user.email || "";

        let salonName = "GLOW SALON";
        let salonArea = "ANDHERI";
        let salonCity = "MUMBAI";
        let salonType = "Unisex salon";
        let salonHours = INITIAL_DATA.hours;
        let salonWa = INITIAL_DATA.wa.number;
        let orgPlan = INITIAL_DATA.plan;
        let selectedSalon: any = null;

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
            .select("id, name, area, city, type, hours, wa_number")
            .eq("org_id", userProfile.org_id)
            .eq("is_primary", true)
            .maybeSingle();

          selectedSalon = salon;
          if (!selectedSalon) {
            const { data: firstSalon } = await supabase
              .from("salons")
              .select("id, name, area, city, type, hours, wa_number")
              .eq("org_id", userProfile.org_id)
              .limit(1)
              .maybeSingle();
            selectedSalon = firstSalon;
          }

          if (selectedSalon) {
            setSupabaseSalonId(selectedSalon.id);
            salonName = selectedSalon.name;
            salonArea = selectedSalon.area || "";
            salonCity = selectedSalon.city || "";
            salonType = selectedSalon.type || "Unisex salon";
            salonHours = selectedSalon.hours ? (selectedSalon.hours as HoursData) : INITIAL_DATA.hours;
            salonWa = selectedSalon.wa_number || "";
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
              dbServices = svcData.map((s: any) => ({
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
              .select("id, name, role_label, tone, commission_pct, active")
              .eq("salon_id", currentSalonId);

            if (teamData && teamData.length > 0) {
              dbTeam = teamData.map((s: any) => ({
                id: s.id,
                name: s.name,
                role: s.role_label || "Stylist",
                tone: (s.tone || "tone-a").replace("tone-", ""),
                commission: Number(s.commission_pct || 0),
              }));
            }
          } catch (err) {
            console.error("Error loading services/team:", err);
          }
        }

        // Load extra settings (wa, notifs) from localStorage if available
        let localWa = INITIAL_DATA.wa;
        let localNotifs = INITIAL_DATA.notifs;

        if (currentSalonId) {
          const storedWa = localStorage.getItem("cb_settings_wa_" + currentSalonId);
          const storedNotifs = localStorage.getItem("cb_settings_notifs_" + currentSalonId);
          if (storedWa) {
            try {
              localWa = { ...localWa, ...JSON.parse(storedWa) };
            } catch (e) {}
          }
          if (storedNotifs) {
            try {
              localNotifs = { ...localNotifs, ...JSON.parse(storedNotifs) };
            } catch (e) {}
          }
        }

        setData({
          salon: {
            name: salonName,
            area: salonArea,
            city: salonCity,
            type: salonType,
          },
          hours: salonHours,
          services: dbServices,
          team: dbTeam,
          plan: orgPlan,
          wa: {
            ...localWa,
            number: salonWa || localWa.number,
          },
          notifs: localNotifs,
          account: {
            name: userName,
            email: userEmail
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
    const supabase = getSupabaseBrowserClient();
    if (supabase && supabaseUserId) {
      setFlash("Saving changes...");
      try {
        if (data.account) {
          const { error: userError } = await supabase
            .from("users")
            .update({ name: data.account.name })
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
              wa_number: data.wa.number
            })
            .eq("id", supabaseSalonId);
          if (salonError) throw salonError;

          // 2. Delete removed services
          const currentSvcIds = data.services
            .map(s => s.id)
            .filter((id): id is string => typeof id === "string");
          if (currentSvcIds.length > 0) {
            await supabase
              .from("services")
              .delete()
              .eq("salon_id", supabaseSalonId)
              .not("id", "in", currentSvcIds);
          } else {
            await supabase
              .from("services")
              .delete()
              .eq("salon_id", supabaseSalonId);
          }

          // 3. Save services
          for (const svc of data.services) {
            const svcPayload: any = {
              salon_id: supabaseSalonId,
              name: svc.name,
              category: svc.cat,
              duration_min: svc.duration,
              price: svc.price,
              active: svc.active,
            };
            if (typeof svc.id === "string") {
              svcPayload.id = svc.id;
            }
            await supabase
              .from("services")
              .upsert(svcPayload, { onConflict: "id" });
          }

          // 4. Delete removed stylists
          const currentTeamIds = data.team
            .map(t => t.id)
            .filter((id): id is string => typeof id === "string");
          if (currentTeamIds.length > 0) {
            await supabase
              .from("stylists")
              .delete()
              .eq("salon_id", supabaseSalonId)
              .not("id", "in", currentTeamIds);
          } else {
            await supabase
              .from("stylists")
              .delete()
              .eq("salon_id", supabaseSalonId);
          }

          // 5. Save team
          for (const stylist of data.team) {
            const stylistPayload: any = {
              salon_id: supabaseSalonId,
              name: stylist.name,
              role_label: stylist.role,
              tone: stylist.tone ? (stylist.tone.startsWith("tone-") ? stylist.tone : `tone-${stylist.tone}`) : "tone-a",
              commission_pct: stylist.commission,
              active: true,
            };
            if (typeof stylist.id === "string") {
              stylistPayload.id = stylist.id;
            }
            await supabase
              .from("stylists")
              .upsert(stylistPayload, { onConflict: "id" });
          }

          // 6. Save Organization Plan if changed
          if (supabaseOrgId && data.plan) {
            const { error: orgError } = await supabase
              .from("organizations")
              .update({ plan: data.plan.toUpperCase() })
              .eq("id", supabaseOrgId);
            if (orgError) throw orgError;
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
            .select("id, name, role_label, tone, commission_pct, active")
            .eq("salon_id", supabaseSalonId);

          setData(prev => ({
            ...prev,
            services: freshSvcs ? freshSvcs.map((s: any) => ({
              id: s.id,
              name: s.name,
              cat: s.category || "General",
              duration: s.duration_min,
              price: Number(s.price),
              active: s.active,
            })) : prev.services,
            team: freshTeam ? freshTeam.map((s: any) => ({
              id: s.id,
              name: s.name,
              role: s.role_label || "Stylist",
              tone: (s.tone || "tone-a").replace("tone-", ""),
              commission: Number(s.commission_pct || 0),
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

        setFlash("Changes saved successfully!");
        setDirty(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        console.error("Error saving settings to Supabase:", err);
        setFlash("Failed to save changes.");
        setTimeout(() => setFlash(null), 2500);
      }
    } else {
      // Local preview mode save
      setFlash("Changes saved (local preview)");
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
      setFlash("Service updated");
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
      setFlash("Service added");
    }
    setShowServiceModal(false);
    setTimeout(() => setFlash(null), 1800);
  };

  const openAddStylist = () => {
    setEditingStylist(null);
    setStylistName("");
    setStylistRole("Senior stylist · 5 yrs");
    setStylistCommission(30);
    setShowStylistModal(true);
  };

  const openEditStylist = (stylist: Stylist) => {
    setEditingStylist(stylist);
    setStylistName(stylist.name);
    setStylistRole(stylist.role || "Stylist");
    setStylistCommission(stylist.commission ?? 40);
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
        commission: stylistCommission
      } : t);
      update({ ...data, team: list });
      setFlash("Stylist updated");
    } else {
      const newStylist: Stylist = {
        id: "temp-" + Date.now(),
        name: stylistName.trim(),
        role: stylistRole,
        tone: toneLetter,
        commission: stylistCommission
      };
      update({ ...data, team: [...data.team, newStylist] });
      setFlash("Stylist added");
    }
    setShowStylistModal(false);
    setTimeout(() => setFlash(null), 1800);
  };

  const openWaChange = () => {
    setWaNumberInput(data.wa.number);
    setShowWaModal(true);
  };

  const saveWaNumber = () => {
    update({
      ...data,
      wa: {
        ...data.wa,
        number: waNumberInput.trim()
      }
    });
    setShowWaModal(false);
    setFlash("WhatsApp number updated locally");
    setTimeout(() => setFlash(null), 1800);
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
    setFlash("Message template updated");
    setTimeout(() => setFlash(null), 1800);
  };

  // ----- RENDER TAB CONTENT -----
  const renderTabContent = () => {
    switch (activeTab) {
      case "salon":
        return (
          <div className="flex flex-col gap-[18px]">
            <SectionHead title="Salon profile" desc="What your customers see on the booking page." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="field">
                <label>Salon name</label>
                <input
                  value={data.salon.name}
                  onChange={e => update({ ...data, salon: { ...data.salon, name: e.target.value } })}
                  style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }}
                />
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <label>Area / address</label>
                <input
                  value={data.salon.area}
                  onChange={e => update({ ...data, salon: { ...data.salon, area: e.target.value } })}
                  style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }}
                />
              </div>
              <div className="field-row" style={{ marginTop: 14 }}>
                <div className="field">
                  <label>City</label>
                  <input
                    value={data.salon.city}
                    onChange={e => update({ ...data, salon: { ...data.salon, city: e.target.value } })}
                    style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }}
                  />
                </div>
                <div className="field">
                  <label>Salon type</label>
                  <select
                    value={data.salon.type}
                    onChange={e => update({ ...data, salon: { ...data.salon, type: e.target.value } })}
                    style={{ height: 40, border: "1px solid var(--line-2)", borderRadius: 8, padding: "0 10px", outline: 0, fontSize: 14, background: "#fff" }}
                  >
                    <option>Unisex salon</option>
                    <option>Ladies salon</option>
                    <option>Men's salon</option>
                    <option>Barbershop</option>
                    <option>Beauty parlour</option>
                    <option>Spa</option>
                  </select>
                </div>
              </div>
            </div>

            <SectionHead title="Photos" desc="At least one photo helps customers trust the salon. 3:2 aspect, < 5 MB each." />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <div className="grid grid-cols-4 gap-2.5 max-[720px]:grid-cols-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="relative aspect-[3/2] rounded-lg overflow-hidden border border-line">
                    <svg viewBox="0 0 100 70" width="100%" height="100%">
                      <defs>
                        <pattern id={`stripes-${i}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(15,110,86,0.15)" strokeWidth="3" />
                        </pattern>
                      </defs>
                      <rect width="100" height="70" fill="var(--teal-soft)" />
                      <rect width="100" height="70" fill={`url(#stripes-${i})`} />
                    </svg>
                    <div className="absolute bottom-1.5 left-2 font-mono text-[10px] text-teal-ink bg-white/80 py-0.5 px-1.5 rounded">photo {i}</div>
                  </div>
                ))}
                <button className="aspect-[3/2] rounded-lg bg-bg-2 border border-dashed border-line-2 flex flex-col items-center justify-center gap-1.5 font-inherit text-xs text-ink-3 cursor-pointer transition-colors duration-150 hover:bg-bg hover:border-ink-3 hover:text-ink" onClick={() => setFlash("Photo upload is a mockup")}>
                  <span className="w-7 h-7 rounded-full bg-white grid place-items-center text-lg font-light border border-line">+</span>
                  Add photo
                </button>
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
                  <div className={`avatar md tone-${s.tone}`}>{s.name[0]}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{s.name}</div>
                    <div className="text-xs text-ink-3 mt-0.5">{s.role}</div>
                  </div>
                  <div className="text-right px-2.5 border-l border-line max-[720px]:col-span-full max-[720px]:p-0 max-[720px]:border-0 max-[720px]:text-left max-[720px]:flex max-[720px]:items-baseline max-[720px]:gap-2">
                    <div className="text-base font-semibold tracking-[-0.015em]">{s.commission}%</div>
                    <div className="text-[10px] text-ink-3 tracking-[0.04em] uppercase max-[720px]:before:content-['·'] max-[720px]:before:mr-1">Commission</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
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
                <span className="badge confirmed no-dot" style={{ marginBottom: 8, padding: "4px 10px" }}>
                  {current.name.toUpperCase()} PLAN · ACTIVE
                </span>
                <div className="text-[32px] font-semibold tracking-[-0.025em] text-teal-ink">
                  ₹{current.price.toLocaleString("en-IN")}<span className="text-sm font-normal text-ink-3"> / month</span>
                </div>
                <div className="text-[13px] text-ink-2 mt-1">{current.desc} · Next charge on 1 June 2026</div>
              </div>
              <div className="flex flex-col gap-2 items-end max-[720px]:flex-row max-[720px]:self-stretch">
                <button className="btn btn-outline btn-sm" onClick={() => setFlash("Plan management is a mockup")}>Manage payment</button>
                <button className="btn btn-ghost btn-sm" style={{ color: "var(--rose)" }} onClick={() => setFlash("Plan cancellation is a mockup")}>Cancel plan</button>
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
              {[
                { date: "1 May 2026", plan: "Salon · monthly", amount: 1179, method: "UPI · ravi@okhdfc" },
                { date: "1 Apr 2026", plan: "Salon · monthly", amount: 1179, method: "UPI · ravi@okhdfc" },
                { date: "1 Mar 2026", plan: "Solo · monthly",  amount: 589,  method: "Card · ****4527" },
              ].map((b, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-3.5 p-[14px_20px] items-center border-b border-line last:border-b-0 max-[720px]:grid-cols-[1fr_auto]">
                  <div>
                    <div className="text-[13px] font-semibold mono">{b.date}</div>
                    <div className="text-xs text-ink-3 mt-0.5">{b.plan}</div>
                  </div>
                  <div className="text-xs text-ink-3 max-[720px]:col-span-full">{b.method}</div>
                  <div className="text-sm font-semibold font-mono">₹{b.amount.toLocaleString("en-IN")}</div>
                  <button className="btn btn-ghost btn-sm max-[720px]:col-start-2" onClick={() => setFlash("Downloading receipt...")}>Receipt</button>
                </div>
              ))}
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
                <div className="field">
                  <label>Name</label>
                  <input
                    value={data.account?.name || ""}
                    onChange={e => update({ ...data, account: { ...data.account, name: e.target.value } })}
                    style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }}
                  />
                </div>
                <div className="field">
                  <label>Phone (login)</label>
                  <input value="+91 98xxx 12345" disabled style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, background: "var(--bg)", color: "var(--ink-3)", cursor: "not-allowed" }} />
                </div>
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <label>Email (for receipts &amp; reports)</label>
                <input
                  value={data.account?.email || ""}
                  onChange={e => update({ ...data, account: { ...data.account, email: e.target.value } })}
                  style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14 }}
                />
              </div>
            </div>

            <SectionHead title="Preferences" />
            <div className="bg-white border border-line rounded-xl p-[20px_22px]">
              <RowField label="Language" value="English" action={<button className="btn btn-ghost btn-sm" onClick={() => setFlash("Language preferences is a mockup")}>Edit</button>} />
              <RowField label="Timezone" value="Asia/Kolkata (IST)" hint="Used for booking times and reports." action={<button className="btn btn-ghost btn-sm" onClick={() => setFlash("Timezone settings is a mockup")}>Edit</button>} />
              <RowField label="Currency" value="Indian Rupee · ₹" action={<button className="btn btn-ghost btn-sm" onClick={() => setFlash("Currency settings is a mockup")}>Edit</button>} />
            </div>

            <SectionHead title="Danger zone" desc="Be careful here." />
            <div className="bg-white border border-rose-soft rounded-xl p-[20px_22px]">
              <RowField
                label="Export all data"
                value="Get a ZIP with customers, bookings, and reports."
                action={<button className="btn btn-outline btn-sm" onClick={() => setFlash("Exporting data ZIP...")}>Request export</button>}
              />
              <RowField
                label="Pause salon"
                value="Stops new bookings without deleting data."
                action={
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: "var(--amber-ink)", borderColor: "var(--amber-soft)" }}
                    onClick={() => setFlash("Salon paused")}
                  >
                    Pause
                  </button>
                }
              />
              <RowField
                label="Delete account"
                value="Permanent. We'll send a 30-day grace email first."
                action={
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: "var(--rose)", borderColor: "var(--rose-soft)" }}
                    onClick={() => setFlash("Account deletion requested")}
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
                  setFlash("Signing out...");
                  const supabase = getSupabaseBrowserClient();
                  if (supabase) {
                    await supabase.auth.signOut();
                  }
                  localStorage.removeItem("cb_profile");
                  localStorage.removeItem("cb_salon_id");
                  setTimeout(() => {
                    router.push("/signin");
                  }, 500);
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

      {/* Sticky save bar */}
      {dirty && (
        <div className="fixed bottom-[calc(var(--bottom-nav-h)+18px)] left-1/2 -translate-x-1/2 w-[min(720px,calc(100%-32px))] bg-ink text-white rounded-[14px] p-[14px_18px] flex justify-between items-center gap-4 shadow-[0_20px_40px_-20px_rgba(14,21,18,0.4)] z-50 animate-pop">
          <div className="text-[13px]">You have unsaved changes.</div>
          <div className="flex gap-2">
            <button className="btn btn-ghost text-white/70 hover:bg-white/8 hover:text-white" style={{ cursor: "pointer" }} onClick={discard}>Discard</button>
            <button className="btn btn-primary" style={{ cursor: "pointer" }} onClick={handleSave}>Save changes</button>
          </div>
        </div>
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
        <div className="modal-back" onClick={() => setShowServiceModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: "min(540px, 100%)" }}>
            <div className="modal-head">
              <h3>{editingSvc ? "Edit service" : "Add new service"}</h3>
              <button className="modal-close" onClick={() => setShowServiceModal(false)}>
                <I.x style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>Service name</label>
                <input
                  placeholder="e.g. Hair Color"
                  value={svcName}
                  onChange={e => setSvcName(e.target.value)}
                  autoFocus
                  style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, width: "100%" }}
                />
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>Category</label>
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
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                <div className="field">
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>Duration (min)</label>
                  <input
                    type="number"
                    value={svcDuration}
                    onChange={e => setSvcDuration(parseInt(e.target.value) || 30)}
                    style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, width: "100%" }}
                  />
                </div>
                <div className="field">
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>Price (₹)</label>
                  <input
                    type="number"
                    value={svcPrice}
                    onChange={e => setSvcPrice(parseInt(e.target.value) || 0)}
                    style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, width: "100%" }}
                  />
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowServiceModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveService} disabled={!svcName.trim()}>
                {editingSvc ? "Save changes" : "Add service"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STYLIST MODAL (ADD & EDIT) */}
      {showStylistModal && (
        <div className="modal-back" onClick={() => setShowStylistModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: "min(540px, 100%)" }}>
            <div className="modal-head">
              <h3>{editingStylist ? "Edit stylist" : "Add new stylist"}</h3>
              <button className="modal-close" onClick={() => setShowStylistModal(false)}>
                <I.x style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>Full name</label>
                <input
                  placeholder="e.g. Anjali Sharma"
                  value={stylistName}
                  onChange={e => setStylistName(e.target.value)}
                  autoFocus
                  style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, width: "100%" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                <div className="field">
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>Role / subtitle</label>
                  <input
                    placeholder="Senior stylist · 5 yrs"
                    value={stylistRole}
                    onChange={e => setStylistRole(e.target.value)}
                    style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, width: "100%" }}
                  />
                </div>
                <div className="field">
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>Commission %</label>
                  <input
                    type="number"
                    value={stylistCommission}
                    onChange={e => setStylistCommission(parseInt(e.target.value) || 0)}
                    min={0}
                    max={100}
                    style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, width: "100%" }}
                  />
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowStylistModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveStylist} disabled={!stylistName.trim()}>
                {editingStylist ? "Save changes" : "Add stylist"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP CHANGE NUMBER MODAL */}
      {showWaModal && (
        <div className="modal-back" onClick={() => setShowWaModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: "min(400px, 100%)" }}>
            <div className="modal-head">
              <h3>Change WhatsApp number</h3>
              <button className="modal-close" onClick={() => setShowWaModal(false)}>
                <I.x style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>Business number</label>
                <input
                  placeholder="98xxx 12345"
                  value={waNumberInput}
                  onChange={e => setWaNumberInput(e.target.value)}
                  autoFocus
                  style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 14, width: "100%" }}
                />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowWaModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveWaNumber} disabled={!waNumberInput.trim()}>
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MESSAGE TEMPLATE MODAL */}
      {editingTemplateKey && (
        <div className="modal-back" onClick={() => setEditingTemplateKey(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: "min(500px, 100%)" }}>
            <div className="modal-head">
              <h3>Edit message template</h3>
              <button className="modal-close" onClick={() => setEditingTemplateKey(null)}>
                <I.x style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>
                  Template text
                </label>
                <textarea
                  rows={4}
                  value={templateText}
                  onChange={e => setTemplateText(e.target.value)}
                  style={{ padding: "10px 12px", border: "1px solid var(--line-2)", borderRadius: 8, outline: 0, fontSize: 13, width: "100%", fontFamily: "monospace", resize: "vertical" }}
                />
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.4 }}>
                  Use placeholders: <code>{`{name}`}</code>, <code>{`{date}`}</code>, <code>{`{time}`}</code>, <code>{`{stylist}`}</code>, <code>{`{service}`}</code>.
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setEditingTemplateKey(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveTemplate}>
                Save template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {flash && (
        <div
          style={{
            position: "fixed",
            bottom: 120,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 13,
            zIndex: 60,
            boxShadow: "0 12px 24px -10px rgba(0,0,0,0.3)",
          }}
        >
          {flash}
        </div>
      )}
    </div>
  );
}
