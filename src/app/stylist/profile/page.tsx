"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import StylistShell from "@/components/layout/StylistShell";
import { Avatar, FormField, Icons as I } from "@/components/ui";
import { useToast } from "@/context/ToastContext";
import type { StylistSessionProfile } from "@/types";

interface ProfileEditorProps {
  profile: StylistSessionProfile;
  updateProfile: (updates: { name: string; roleLabel: string; specialisations: string[]; bookingSlug: string | null; photoUrl?: string | null }) => Promise<void>;
  uploadProfilePhoto: (file: File) => Promise<string | null>;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ProfileEditor({ profile, updateProfile, uploadProfilePhoto }: ProfileEditorProps) {
  const { show } = useToast();
  const [name, setName] = useState(profile.name);
  const [roleLabel, setRoleLabel] = useState(profile.roleLabel);
  const [specialisations, setSpecialisations] = useState(profile.specialisations.join(", "));
  const [bookingSlug, setBookingSlug] = useState(profile.bookingSlug || slugify(profile.name));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const bookingLink = useMemo(() => {
    if (!profile?.salonSlug || !bookingSlug.trim()) return "";
    if (typeof window === "undefined") return `/${profile.salonSlug}?stylist=${bookingSlug.trim()}`;
    return `${window.location.origin}/${profile.salonSlug}?stylist=${bookingSlug.trim()}`;
  }, [bookingSlug, profile?.salonSlug]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        roleLabel: roleLabel.trim() || "Stylist",
        specialisations: specialisations.split(",").map((item) => item.trim()).filter(Boolean),
        bookingSlug: bookingSlug.trim() || null,
      });
      show("Profile saved", 1600);
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not save profile", 2600);
    } finally {
      setSaving(false);
    }
  };

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadProfilePhoto(file);
      show("Photo updated", 1600);
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not upload photo", 2600);
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="max-w-[760px] mx-auto px-4 md:px-8 py-7">
      <div className="bg-white border border-line rounded-xl p-5 md:p-6">
        <div className="flex items-center gap-4 pb-5 border-b border-line">
          {profile.photoUrl ? (
            <Image src={profile.photoUrl} alt="" width={64} height={64} unoptimized className="w-16 h-16 rounded-full object-cover border border-line" />
          ) : (
            <Avatar initials={profile.initials} tone={profile.tone} size="lg" className="!w-16 !h-16 !text-xl" />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-base truncate">{profile.name}</div>
            <div className="text-sm text-ink-3 mt-0.5 truncate">{profile.roleLabel} · {profile.salonName}</div>
          </div>
          <label className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-line bg-white text-sm font-medium cursor-pointer hover:bg-bg-2">
            <I.upload /> {uploading ? "Uploading" : "Photo"}
            <input type="file" accept="image/*" className="hidden" onChange={upload} disabled={uploading} />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          <FormField label="Display name">
            <input value={name} onChange={(event) => setName(event.target.value)} className="w-full h-[42px] px-3.5 rounded-[10px] border border-line-2 bg-white font-sans text-sm text-ink outline-none focus:border-teal" />
          </FormField>
          <FormField label="Role / title">
            <input value={roleLabel} onChange={(event) => setRoleLabel(event.target.value)} className="w-full h-[42px] px-3.5 rounded-[10px] border border-line-2 bg-white font-sans text-sm text-ink outline-none focus:border-teal" />
          </FormField>
        </div>

        <FormField label="Specialisations" className="mt-3">
          <input
            value={specialisations}
            onChange={(event) => setSpecialisations(event.target.value)}
            placeholder="Haircuts, color, bridal styling"
            className="w-full h-[42px] px-3.5 rounded-[10px] border border-line-2 bg-white font-sans text-sm text-ink outline-none focus:border-teal"
          />
        </FormField>

        <FormField label="Personal booking link" className="mt-3">
          <div className="flex gap-2 max-[540px]:flex-col">
            <input
              value={bookingSlug}
              onChange={(event) => setBookingSlug(slugify(event.target.value))}
              className="flex-1 h-[42px] px-3.5 rounded-[10px] border border-line-2 bg-white font-sans text-sm text-ink outline-none focus:border-teal"
            />
            <button
              className="h-[42px] px-3 rounded-[10px] border border-line bg-white text-sm font-medium cursor-pointer hover:bg-bg-2"
              onClick={() => {
                if (bookingLink) navigator.clipboard?.writeText(bookingLink);
                show("Booking link copied", 1200);
              }}
              type="button"
            >
              Copy
            </button>
          </div>
          {bookingLink && <div className="text-xs text-ink-3 mt-2 break-all">{bookingLink}</div>}
        </FormField>

        <button
          className="mt-5 h-10 px-4 rounded-[10px] bg-teal text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
          onClick={save}
          disabled={saving || !name.trim()}
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </div>
    </main>
  );
}

export default function StylistProfilePage() {
  return (
    <StylistShell title="My profile" subtitle="PUBLIC BOOKING IDENTITY">
      {({ profile, loading, updateProfile, uploadProfilePhoto }) => {
        if (loading || !profile) {
          return (
            <main className="max-w-[760px] mx-auto px-4 md:px-8 py-7">
              <div className="h-[360px] bg-bg-2 rounded-xl animate-pulse" />
            </main>
          );
        }

        return (
          <ProfileEditor
            key={`${profile.stylistId}-${profile.bookingSlug || ""}`}
            profile={profile}
            updateProfile={updateProfile}
            uploadProfilePhoto={uploadProfilePhoto}
          />
        );
      }}
    </StylistShell>
  );
}
