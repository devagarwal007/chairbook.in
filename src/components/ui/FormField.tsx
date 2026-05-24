import React from "react";

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  error,
  children,
  className = "",
  ...props
}: FormFieldProps) {
  return (
    <div className={`field flex flex-col gap-1.5 ${className}`} {...props}>
      <label className="text-xs text-ink-3 font-medium">{label}</label>
      {children}
      {error && <span className="text-xs text-rose mt-1">{error}</span>}
    </div>
  );
}
