"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import { Icons } from "@/components/ui/Icons";
import { useProfile } from "@/context/ProfileContext";

const I = {
  ...Icons,
  bellSm: Icons.bell,
};

import { HoursData, Service, Stylist } from "@/types";

// ===== TYPES =====
interface SalonInfo {
  name: string;
  area: string;
  type: string;
  city: string;
}

interface WhatsAppTemplates {
  confirmation: string;
  reminder: string;
  reengagement: string;
}

interface WhatsAppInfo {
  number: string;
  verified: boolean;
  reminder: number;
  autoConfirm: boolean;
  sendOffers: boolean;
  templates: WhatsAppTemplates;
}

interface NotificationChannel {
  push: boolean;
  sms: boolean;
  wa: boolean;
}

interface Notifications {
  [key: string]: NotificationChannel;
}

interface AccountInfo {
  name: string;
  email: string;
}

interface SettingsData {
  salon: SalonInfo;
  hours: HoursData;
  services: Service[];
  team: Stylist[];
  wa: WhatsAppInfo;
  plan: string;
  notifs: Notifications;
  account: AccountInfo;
}

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
  { id: "notifs",   label: "Notifications", icon: I.bellSm },
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
    <div className="set-section-head">
      <div>
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
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
    <div className="set-row">
      <div>
        <div className="set-row-lbl">{label}</div>
        <div className="set-row-val">{value}</div>
        {hint && <div className="set-row-hint">{hint}</div>}
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
          <div className="set-content">
            <SectionHead title="Salon profile" desc="What your customers see on the booking page." />
            <div className="set-card">
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
            <div className="set-card">
              <div className="set-photos">
                {[1, 2, 3].map(i => (
                  <div key={i} className="set-photo-slot">
                    <svg viewBox="0 0 100 70" width="100%" height="100%">
                      <defs>
                        <pattern id={`stripes-${i}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(15,110,86,0.15)" strokeWidth="3" />
                        </pattern>
                      </defs>
                      <rect width="100" height="70" fill="var(--teal-soft)" />
                      <rect width="100" height="70" fill={`url(#stripes-${i})`} />
                    </svg>
                    <div className="set-photo-label">photo {i}</div>
                  </div>
                ))}
                <button className="set-photo-add" onClick={() => setFlash("Photo upload is a mockup")}>
                  <span className="set-photo-add-ic">+</span>
                  Add photo
                </button>
              </div>
            </div>

            <SectionHead title="Working hours" desc="Customers will only see slots inside these hours." />
            <div className="set-card">
              <div className="set-hours">
                {DAYS.map(d => {
                  const h = data.hours[d.id] || { open: false, from: "10:00", to: "20:00" };
                  return (
                    <div key={d.id} className={`set-hour-row ${h.open ? "" : "off"}`}>
                      <label className="set-hour-toggle">
                        <input
                          type="checkbox"
                          checked={h.open}
                          onChange={e => update({ ...data, hours: { ...data.hours, [d.id]: { ...h, open: e.target.checked } } })}
                        />
                        <span>{d.name}</span>
                      </label>
                      {h.open ? (
                        <div className="set-hour-times">
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
                        <div className="set-hour-times closed">Closed</div>
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
          <div className="set-content">
            <SectionHead
              title="Services"
              desc={`${data.services.filter(s => s.active).length} active · ${data.services.length} total`}
              action={
                <button className="btn btn-primary btn-sm" onClick={openAddService}>
                  <I.plus style={{ width: 14, height: 14 }} /> Add service
                </button>
              }
            />
            <div className="set-card" style={{ padding: 0 }}>
              {["Hair", "Skin", "Hands", "Nails", "General"].map(cat => {
                const items = data.services.filter(s => s.cat === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="set-svc-cat">
                      {cat} <span>{items.length}</span>
                    </div>
                    {items.map(s => (
                      <div key={s.id} className={`set-svc-row ${!s.active ? "inactive" : ""}`}>
                        <div className="set-svc-main">
                          <div className="set-svc-name">{s.name}</div>
                          <div className="set-svc-meta">
                            {s.duration} min · ₹{s.price.toLocaleString("en-IN")}
                            {!s.active && " · Hidden from booking page"}
                          </div>
                        </div>
                        <label className="set-toggle">
                          <input
                            type="checkbox"
                            checked={s.active}
                            onChange={() => {
                              const list = data.services.map(item => item.id === s.id ? { ...item, active: !item.active } : item);
                              update({ ...data, services: list });
                            }}
                          />
                          <span className="set-toggle-track"></span>
                        </label>
                        <button
                          className="cust-action wa"
                          style={{ opacity: 1, background: "transparent", borderColor: "var(--line)", cursor: "pointer" }}
                          onClick={() => openEditService(s)}
                        >
                          <I.edit style={{ width: 14, height: 14 }} />
                        </button>
                        <button
                          className="cust-action"
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
          <div className="set-content">
            <SectionHead
              title="Team"
              desc={`${data.team.length} stylists${data.plan === "salon" ? " · Up to 5 on your plan" : ""}`}
              action={
                <button className="btn btn-primary btn-sm" onClick={openAddStylist}>
                  <I.plus style={{ width: 14, height: 14 }} /> Add stylist
                </button>
              }
            />
            <div className="set-card" style={{ padding: 0 }}>
              {data.team.map(s => (
                <div key={s.id} className="set-team-row">
                  <div className={`avatar md tone-${s.tone}`}>{s.name[0]}</div>
                  <div className="set-team-main">
                    <div className="set-team-name">{s.name}</div>
                    <div className="set-team-role">{s.role}</div>
                  </div>
                  <div className="set-team-comm">
                    <div className="num">{s.commission}%</div>
                    <div className="lbl">Commission</div>
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
          <div className="set-content">
            <SectionHead title="WhatsApp integration" desc="The number customers receive messages from." />
            <div className="set-card">
              <div className="set-wa-status">
                <div className="set-wa-status-l">
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
            <div className="set-card">
              <div className="set-toggle-row">
                <div>
                  <div className="set-toggle-name">Auto-confirm via WhatsApp</div>
                  <div className="set-toggle-hint">When a customer books, send them a WhatsApp confirmation immediately.</div>
                </div>
                <label className="set-toggle">
                  <input
                    type="checkbox"
                    checked={data.wa.autoConfirm}
                    onChange={e => update({ ...data, wa: { ...data.wa, autoConfirm: e.target.checked } })}
                  />
                  <span className="set-toggle-track"></span>
                </label>
              </div>
              <div className="set-toggle-row">
                <div>
                  <div className="set-toggle-name">Send reminders {data.wa.reminder} hours before</div>
                  <div className="set-toggle-hint">Customers reply YES to confirm. Studies show this cuts no-shows by 60%.</div>
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
              <div className="set-toggle-row">
                <div>
                  <div className="set-toggle-name">Promotional broadcasts</div>
                  <div className="set-toggle-hint">Allow sending offers / campaigns to your customer list. Off by default.</div>
                </div>
                <label className="set-toggle">
                  <input
                    type="checkbox"
                    checked={data.wa.sendOffers}
                    onChange={e => update({ ...data, wa: { ...data.wa, sendOffers: e.target.checked } })}
                  />
                  <span className="set-toggle-track"></span>
                </label>
              </div>
            </div>

            <SectionHead title="Message templates" desc="Edit what your customers see. Variables like {name} are replaced automatically." />
            <div className="set-card">
              <div className="set-tpl-row">
                <div className="set-tpl-l">
                  <div className="set-tpl-name">Booking confirmation</div>
                  <div className="set-tpl-preview">{data.wa.templates?.confirmation}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => openEditTemplate("confirmation")}>
                  <I.edit style={{ marginRight: 4 }} /> Edit
                </button>
              </div>
              <div className="set-tpl-row">
                <div className="set-tpl-l">
                  <div className="set-tpl-name">Reminder</div>
                  <div className="set-tpl-preview">{data.wa.templates?.reminder}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => openEditTemplate("reminder")}>
                  <I.edit style={{ marginRight: 4 }} /> Edit
                </button>
              </div>
              <div className="set-tpl-row">
                <div className="set-tpl-l">
                  <div className="set-tpl-name">Re-engagement</div>
                  <div className="set-tpl-preview">{data.wa.templates?.reengagement}</div>
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
          <div className="set-content">
            <SectionHead title="Current plan" />
            <div className="set-card set-plan-card">
              <div className="set-plan-l">
                <span className="badge confirmed no-dot" style={{ marginBottom: 8, padding: "4px 10px" }}>
                  {current.name.toUpperCase()} PLAN · ACTIVE
                </span>
                <div className="set-plan-price">
                  ₹{current.price.toLocaleString("en-IN")}<span> / month</span>
                </div>
                <div className="set-plan-desc">{current.desc} · Next charge on 1 June 2026</div>
              </div>
              <div className="set-plan-r">
                <button className="btn btn-outline btn-sm" onClick={() => setFlash("Plan management is a mockup")}>Manage payment</button>
                <button className="btn btn-ghost btn-sm" style={{ color: "var(--rose)" }} onClick={() => setFlash("Plan cancellation is a mockup")}>Cancel plan</button>
              </div>
            </div>

            <SectionHead title="Change plan" desc="Upgrade or downgrade anytime. Pro-rated to your next bill." />
            <div className="set-plan-grid">
              {PLANS.map(p => {
                const isCurrent = p.id === data.plan;
                return (
                  <div key={p.id} className={`set-plan-card-sm ${isCurrent ? "on" : ""}`}>
                    <div className="set-plan-name">{p.name}</div>
                    <div className="set-plan-pricesm">
                      ₹{p.price.toLocaleString("en-IN")}<span>/mo</span>
                    </div>
                    <div className="set-plan-desc">{p.desc}</div>
                    <button
                      className="btn btn-outline btn-sm"
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
            <div className="set-card" style={{ padding: 0 }}>
              {[
                { date: "1 May 2026", plan: "Salon · monthly", amount: 1179, method: "UPI · ravi@okhdfc" },
                { date: "1 Apr 2026", plan: "Salon · monthly", amount: 1179, method: "UPI · ravi@okhdfc" },
                { date: "1 Mar 2026", plan: "Solo · monthly",  amount: 589,  method: "Card · ****4527" },
              ].map((b, i) => (
                <div key={i} className="set-bill-row">
                  <div>
                    <div className="set-bill-date mono">{b.date}</div>
                    <div className="set-bill-plan">{b.plan}</div>
                  </div>
                  <div className="set-bill-meta">{b.method}</div>
                  <div className="set-bill-amount">₹{b.amount.toLocaleString("en-IN")}</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setFlash("Downloading receipt...")}>Receipt</button>
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
          <div className="set-content">
            <SectionHead title="Notifications" desc="Choose how you'd like to be alerted." />
            <div className="set-card" style={{ padding: 0 }}>
              <div className="set-notif-head">
                <div></div>
                {channels.map(c => (
                  <div key={c} className="set-notif-col">{channelLabel[c]}</div>
                ))}
              </div>
              {rows.map(r => {
                const notifChannels = data.notifs[r.id] || { push: false, sms: false, wa: false };
                return (
                  <div key={r.id} className="set-notif-row">
                    <div>
                      <div className="set-notif-name">{r.label}</div>
                      <div className="set-notif-desc">{r.desc}</div>
                    </div>
                    {channels.map(c => (
                      <div key={c} className="set-notif-col">
                        <label className="set-toggle">
                          <input
                            type="checkbox"
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
                          <span className="set-toggle-track"></span>
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
          <div className="set-content">
            <SectionHead title="Your profile" />
            <div className="set-card">
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
            <div className="set-card">
              <RowField label="Language" value="English" action={<button className="btn btn-ghost btn-sm" onClick={() => setFlash("Language preferences is a mockup")}>Edit</button>} />
              <RowField label="Timezone" value="Asia/Kolkata (IST)" hint="Used for booking times and reports." action={<button className="btn btn-ghost btn-sm" onClick={() => setFlash("Timezone settings is a mockup")}>Edit</button>} />
              <RowField label="Currency" value="Indian Rupee · ₹" action={<button className="btn btn-ghost btn-sm" onClick={() => setFlash("Currency settings is a mockup")}>Edit</button>} />
            </div>

            <SectionHead title="Danger zone" desc="Be careful here." />
            <div className="set-card set-danger">
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
                <Icons.logout style={{ width: 14, height: 14 }} /> Logout
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
      <div className="app-top">
        <div className="app-top-inner">
          <Link href="/dashboard" className="brand" style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}>
            <span className="brand-text">ChairBook</span>
            <span className="badge neutral no-dot mono salon-tag" style={{ marginLeft: 12, fontSize: 10, letterSpacing: "0.05em" }}>
              {(data.salon.name || "GLOW SALON").toUpperCase()} · {(data.salon.area || "ANDHERI").toUpperCase()}
            </span>
          </Link>
          <div className="greeting">
            <div className="h">Settings</div>
            <div className="d">CONFIGURE YOUR SALON</div>
          </div>
          <div className="top-actions" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/dashboard/notifications" className="icon-btn" aria-label="Notifications" style={{ display: "flex" }}>
              <I.bellSm style={{ width: 18, height: 18 }} />
              <span className="ind"></span>
            </Link>
            <div className="avatar sm tone-b">{data.account?.name ? data.account.name[0].toUpperCase() : "R"}</div>
          </div>
        </div>
      </div>

      <main className="app-main set-main">
        <div className="set-layout">
          {/* Sidebar tabs */}
          <aside className="set-sidebar">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`set-tab ${active ? "on" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="set-tab-ic">
                    <Icon style={{ width: 16, height: 16 }} />
                  </span>
                  {tab.label}
                  <I.chevR style={{ marginLeft: "auto", color: "var(--ink-4)", width: 14, height: 14 }} />
                </button>
              );
            })}
          </aside>

          {/* Active Panel Content */}
          <div className="set-panel">
            {renderTabContent()}
          </div>
        </div>
      </main>

      {/* Sticky save bar */}
      {dirty && (
        <div className="set-savebar">
          <div className="set-savebar-l">You have unsaved changes.</div>
          <div className="set-savebar-r">
            <button className="btn btn-ghost" style={{ cursor: "pointer" }} onClick={discard}>Discard</button>
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
        <Link className="bn-item" href="/dashboard"><Icons.home /><span>Home</span></Link>
        <Link className="bn-item" href="/dashboard/bookings"><Icons.calendar /><span>Bookings</span></Link>
        <Link className="bn-item" href="/dashboard/customers"><Icons.users /><span>Customers</span></Link>
        <Link className="bn-item" href="/dashboard/insights"><Icons.chart /><span>Insights</span></Link>
        <Link className="bn-item active" href="/dashboard/settings"><Icons.settings /><span>Settings</span></Link>
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
