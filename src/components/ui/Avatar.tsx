import React from "react";

export interface AvatarProps {
  initials: string;
  tone?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
}

export function Avatar({
  initials,
  tone = "a",
  size = "md",
  className = "",
  style,
}: AvatarProps) {
  const normalizedTone = (tone || "a").replace("tone-", "");

  const sizeClasses = {
    sm: "w-[18px] h-[18px] text-[9px]",
    md: "w-10 h-10 text-sm",
    lg: "w-[44px] h-[44px] text-base",
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  const toneBgMap: Record<string, string> = {
    a: "bg-[#F1EAD9] text-[#8C6A1E]",
    b: "bg-teal-soft text-teal",
    c: "bg-blue-soft text-blue",
    d: "bg-[#F4DCE4] text-[#A03364]",
    e: "bg-amber-soft text-amber-ink",
    f: "bg-rose-soft text-rose",
  };

  const bgClass = toneBgMap[normalizedTone] || "bg-bg-2 text-ink-2";

  return (
    <div
      className={`avatar rounded-full shrink-0 grid place-items-center font-bold font-sans ${sizeClass} ${bgClass} ${className}`}
      style={style}
    >
      {initials}
    </div>
  );
}
