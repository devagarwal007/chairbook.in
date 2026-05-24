import React, { useMemo } from "react";

export interface ToggleOption<T> {
  value: T;
  label: string;
}

export interface ToggleProps<T> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "default" | "big";
  hasSlider?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Toggle<T extends string | number>({
  options,
  value,
  onChange,
  size = "default",
  hasSlider = false,
  className = "",
  style,
}: ToggleProps<T>) {
  const selectedIndex = useMemo(() => {
    return options.findIndex((opt) => opt.value === value);
  }, [options, value]);

  const toggleClass = size === "big" ? "toggle big" : "toggle";

  if (hasSlider) {
    const pct = options.length > 0 ? 100 / options.length : 100;
    const transformX = selectedIndex >= 0 ? `${selectedIndex * 100}%` : "0%";

    return (
      <div
        className={`inline-flex relative items-center p-[3px] bg-bg-2 rounded-[9px] text-[13px] ${className}`}
        style={style}
      >
        <div
          className="absolute top-[3px] bottom-[3px] left-[3px] bg-white rounded-[7px] transition-transform duration-220 ease-[cubic-bezier(0.16,1,0.3,1)] z-0 shadow-[0_1px_3px_rgba(0,0,0,0.08),_0_1px_0_var(--line)] will-change-transform"
          style={{
            width: `calc(${pct}% - 3px)`,
            transform: `translateX(${transformX})`,
          }}
        />
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`flex-1 text-center py-1.5 px-1 border-0 bg-transparent rounded-[7px] cursor-pointer text-[13px] transition-colors duration-150 relative z-10 ${
              value === opt.value ? "text-ink font-medium" : "text-ink-3"
            }`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`${toggleClass} ${className}`} style={style}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={value === opt.value ? "on" : ""}
          onClick={() => onChange(opt.value)}
          style={{ flex: 1 }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
