import React from "react";

interface ComboSaveBadgeProps {
  savings: number;
  className?: string;
}

export function ComboSaveBadge({ savings, className = "" }: ComboSaveBadgeProps) {
  if (savings <= 0) return null;
  return (
    <span
      className={`inline-flex items-center bg-[#0f6e56] text-white font-sans text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap leading-none ${className}`}
    >
      <svg
        className="w-2.5 h-2.5 mr-1 stroke-current fill-none shrink-0"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
      >
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <circle cx="7" cy="7" r="1" fill="currentColor" />
      </svg>
      SAVE ₹{savings.toLocaleString("en-IN")}
    </span>
  );
}
