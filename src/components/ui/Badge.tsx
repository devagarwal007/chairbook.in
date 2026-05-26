import React from "react";

export type BadgeTone =
  | "blue"
  | "amber"
  | "green"
  | "rose"
  | "gray"
  | "confirmed"
  | "arrived"
  | "in_service"
  | "completed"
  | "noshow"
  | "cancelled";

export interface BadgeProps {
  tone?: BadgeTone;
  showDot?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const toneClasses: Record<BadgeTone, string> = {
  blue: "text-[#1957B8] bg-[#E6EEFA]",
  confirmed: "text-[#1957B8] bg-[#E6EEFA]",
  amber: "text-[#B47A0F] bg-amber-soft",
  arrived: "text-[#B47A0F] bg-amber-soft",
  in_service: "text-teal bg-teal-soft",
  green: "text-[#137A4A] bg-[#DFF1E6]",
  completed: "text-[#137A4A] bg-[#DFF1E6]",
  rose: "text-rose bg-[#FAE2DC]",
  noshow: "text-rose bg-[#FAE2DC]",
  gray: "text-ink-3 bg-bg-2",
  cancelled: "text-ink-3 bg-bg-2",
};

export function Badge({
  tone = "gray",
  showDot = true,
  children,
  className = "",
  style,
}: BadgeProps) {
  const colorClass = toneClasses[tone] || toneClasses.gray;
  return (
    <span
      className={`inline-flex items-center gap-[4px] text-[9px] font-medium px-[7px] py-[3px] rounded-full tracking-[0.01em] whitespace-nowrap ${colorClass} ${className}`}
      style={style}
    >
      {showDot && (
        <span className="w-[5px] h-[5px] rounded-full bg-current inline-block" />
      )}
      {children}
    </span>
  );
}
