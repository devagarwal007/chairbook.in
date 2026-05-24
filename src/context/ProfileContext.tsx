"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { initialsOf } from "@/lib/utils";
import type { Profile } from "@/types";

interface ProfileContextType {
  profile: Profile;
  salonId: string | null;
  loading: boolean;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  setSalonId: React.Dispatch<React.SetStateAction<string | null>>;
  refreshProfile: () => Promise<void>;
  updateProfileInContext: (newProfile: Partial<Profile>) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>({
    name: "Ravi Kumar",
    role: "Owner",
    salonName: "GLOW SALON",
    salonArea: "ANDHERI",
    initials: "R",
  });
  const [salonId, setSalonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    // 1. Check local storage cache first to show cached data immediately on mount
    if (typeof window !== "undefined") {
      const cachedProfile = localStorage.getItem("cb_profile");
      const cachedSalonId = localStorage.getItem("cb_salon_id");
      if (cachedProfile) {
        try {
          setProfile(JSON.parse(cachedProfile));
        } catch (e) {
          console.error("Error parsing cached profile:", e);
        }
      }
      if (cachedSalonId) {
        setSalonId(cachedSalonId);
      }
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data: userProfile } = await supabase
        .from("users")
        .select("name, role, org_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!userProfile) {
        setLoading(false);
        return;
      }

      const userName = userProfile.name || session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Owner";
      const userRole = userProfile.role ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1) : "Owner";
      const initials = initialsOf(userName);

      let salonName = "GLOW SALON";
      let salonArea = "ANDHERI";
      let salonIdVal: string | null = null;

      if (userProfile.org_id) {
        const { data: salon } = await supabase
          .from("salons")
          .select("id, name, area")
          .eq("org_id", userProfile.org_id)
          .eq("is_primary", true)
          .maybeSingle();

        if (salon) {
          salonName = salon.name;
          salonArea = salon.area || "";
          salonIdVal = salon.id;
        } else {
          const { data: firstSalon } = await supabase
            .from("salons")
            .select("id, name, area")
            .eq("org_id", userProfile.org_id)
            .limit(1)
            .maybeSingle();
          if (firstSalon) {
            salonName = firstSalon.name;
            salonArea = firstSalon.area || "";
            salonIdVal = firstSalon.id;
          }
        }
      }

      const newProfile = {
        name: userName,
        role: userRole,
        salonName: salonName.toUpperCase(),
        salonArea: salonArea.toUpperCase(),
        initials,
      };

      setProfile(newProfile);
      localStorage.setItem("cb_profile", JSON.stringify(newProfile));

      if (salonIdVal) {
        setSalonId(salonIdVal);
        localStorage.setItem("cb_salon_id", salonIdVal);
      }
    } catch (err) {
      console.error("Error loading user profile in context:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfileInContext = (newProfileData: Partial<Profile>) => {
    setProfile((prev) => {
      const updated = { ...prev, ...newProfileData };
      if (newProfileData.name) {
        updated.initials = initialsOf(newProfileData.name);
      }
      localStorage.setItem("cb_profile", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchProfile();
    });
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        salonId,
        loading,
        setProfile,
        setSalonId,
        refreshProfile: fetchProfile,
        updateProfileInContext,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
