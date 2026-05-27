import React from "react";

interface ComboServiceChipProps {
  name: string;
  className?: string;
}

export function ComboServiceChip({ name, className = "" }: ComboServiceChipProps) {
  return (
    <span
      className={`px-1.5 py-0.5 border border-[#d7dce0] rounded-[6px] bg-white text-[10.5px] font-medium leading-[1.4] text-[#5f6871] font-sans whitespace-nowrap ${className}`}
    >
      {name}
    </span>
  );
}
