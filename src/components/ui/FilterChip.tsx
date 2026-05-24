import React from "react";
import { Avatar } from "@/components/ui/Avatar";

export interface FilterChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  avatarInitials?: string;
  avatarTone?: string | null;
  count?: number;
  className?: string;
}

export function FilterChip({
  label,
  isActive,
  onClick,
  avatarInitials,
  avatarTone,
  count,
  className = "",
}: FilterChipProps) {
  return (
    <button
      type="button"
      className={`h-8 px-3 rounded-full border inline-flex items-center gap-2 text-[13px] cursor-pointer transition-all duration-180 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-ink-3 hover:-translate-y-[1px] active:scale-96 will-change-transform ${
        isActive
          ? "bg-ink text-white border-ink"
          : "bg-white border-line-2 text-ink-2"
      } ${className}`}
      onClick={onClick}
    >
      {avatarInitials && (
        <Avatar
          initials={avatarInitials}
          tone={avatarTone}
          size="sm"
          style={{ width: 18, height: 18, fontSize: 9 }}
        />
      )}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`text-[11px] ml-1.5 ${
            isActive ? "text-white/60" : "text-ink-4"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
