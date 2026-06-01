"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Icons } from "@/components/ui/Icons";
import { Avatar } from "@/components/ui/Avatar";
import { signOutCurrentUser } from "@/lib/auth-session";
import type { StylistSessionProfile } from "@/types";

interface StylistHeaderProps {
  title: string;
  subtitle?: string;
  profile: StylistSessionProfile | null;
  unreadCount?: number;
}

export default function StylistHeader({ title, subtitle, profile, unreadCount = 0 }: StylistHeaderProps) {
  const router = useRouter();

  const signOut = async () => {
    await signOutCurrentUser();
    router.replace("/signin");
    router.refresh();
  };

  return (
    <header className="bg-bg border-b border-line">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-4 md:py-[22px] flex flex-wrap md:flex-nowrap items-center justify-between gap-4 md:gap-6">
        <Link href="/stylist" className="flex items-center gap-[10px] font-semibold text-base no-underline text-inherit order-1">
          <BrandLogo size="md" />
          <span className="hidden sm:inline-flex items-center gap-[5px] text-[10px] font-medium px-[9px] py-[3px] rounded-full tracking-[0.05em] leading-[1.4] whitespace-nowrap font-mono text-teal bg-teal-soft no-underline">
            STYLIST
          </span>
          {profile && (
            <span className="hidden lg:inline-flex items-center gap-[5px] text-[10px] font-medium px-[9px] py-[3px] rounded-full tracking-[0.05em] leading-[1.4] whitespace-nowrap font-mono text-ink-2 bg-bg-2 no-underline">
              {profile.salonName}{profile.salonArea ? ` · ${profile.salonArea}` : ""}
            </span>
          )}
        </Link>
        <div className="flex flex-col gap-[2px] w-full md:w-auto order-3 md:order-2 md:text-center mt-1 md:mt-0">
          <div className="text-[20px] md:text-[22px] font-semibold tracking-[-0.015em]">{title}</div>
          {subtitle && <div className="text-[12px] md:text-[13px] text-ink-3 font-mono">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-[10px] order-2 md:order-3">
          <Link href="/stylist/notifications" aria-label="Notifications" className="w-10 h-10 rounded-[10px] border border-line bg-white grid place-items-center text-ink-2 cursor-pointer hover:bg-bg-2 transition-all duration-150 relative no-underline">
            <Icons.bell />
            {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber border-2 border-white box-content" />}
          </Link>
          <Link href="/stylist/profile" className="no-underline text-inherit">
            {profile?.photoUrl ? (
              <Image src={profile.photoUrl} alt="" width={30} height={30} unoptimized className="w-[30px] h-[30px] rounded-full object-cover border-2 border-teal" />
            ) : (
              <Avatar initials={profile?.initials || "S"} tone={profile?.tone || "b"} size="sm" className="w-[30px] h-[30px]" />
            )}
          </Link>
          <button
            onClick={signOut}
            className="hidden sm:grid w-10 h-10 rounded-[10px] border border-line bg-white place-items-center text-ink-2 cursor-pointer hover:bg-bg-2 transition-all duration-150"
            aria-label="Log out"
          >
            <Icons.logout />
          </button>
        </div>
      </div>
    </header>
  );
}
