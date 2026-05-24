import React from "react";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "size"> {
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  size?: "md" | "lg";
  containerClassName?: string;
}

export function PhoneInput({
  value,
  onChange,
  prefix = "+91",
  size = "md",
  containerClassName = "",
  placeholder = "98xxx xxxxx",
  ...props
}: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    let clean = raw.replace(/\D/g, "");
    
    if (clean.startsWith("91") && clean.length > 10) {
      clean = clean.substring(2);
    } else if (clean.startsWith("0")) {
      clean = clean.substring(1);
    }
    
    clean = clean.substring(0, 10);
    onChange(clean);
  };

  const heightClass = size === "lg" ? "h-[46px]" : "h-[42px]";
  const textClass = size === "lg" ? "text-base" : "text-sm";

  return (
    <div
      className={`phone-input flex items-center border border-line-2 rounded-[10px] overflow-hidden bg-white ${heightClass} ${containerClassName}`}
    >
      <span
        className={`phone-prefix px-3.5 border-r border-line-2 bg-bg-2 text-ink-2 ${textClass} font-medium h-full flex items-center shrink-0`}
      >
        {prefix}
      </span>
      <input
        type="tel"
        className={`border-0 px-3.5 outline-none w-full h-full ${textClass} text-ink font-sans`}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        {...props}
      />
    </div>
  );
}
