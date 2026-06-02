import React from "react";
import { Icons } from "./Icons";

interface SearchBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "value"> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}

export function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = "Search",
  className = "",
  maxLength = 120,
  role = "searchbox",
  "aria-label": ariaLabel,
  ...props
}: SearchBarProps) {
  const clearSearch = () => {
    onChange("");
    onClear?.();
  };

  return (
    <div className={`relative h-8 ${className}`}>
      <Icons.search
        width={15}
        height={15}
        strokeWidth={2}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-4"
        aria-hidden="true"
      />
      <input
        {...props}
        type="text"
        role={role}
        aria-label={ariaLabel ?? (typeof placeholder === "string" ? placeholder : undefined)}
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        spellCheck={false}
        className="h-full w-full appearance-none rounded-lg border border-line-2 bg-white pl-8 pr-8 font-sans text-sm text-ink outline-0 transition-colors duration-150 placeholder:text-ink-4 focus:border-teal"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={clearSearch}
          className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-md border-0 bg-transparent text-ink-4 transition-colors duration-150 hover:bg-bg-2 hover:text-ink"
        >
          <Icons.x width={13} height={13} strokeWidth={2.2} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
