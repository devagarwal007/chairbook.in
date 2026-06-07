import type { ReactNode } from "react";

interface RowFieldProps {
  label: string;
  value: string;
  hint?: string;
  action?: ReactNode;
}

export default function RowField({ label, value, hint, action }: RowFieldProps) {
  return (
    <div className="flex justify-between items-center py-3.5 border-b border-line first:pt-0 last:border-b-0 last:pb-0">
      <div>
        <div className="text-[11px] font-semibold tracking-[0.04em] uppercase text-ink-3">{label}</div>
        <div className="text-sm font-medium mt-1">{value}</div>
        {hint && <div className="text-xs text-ink-3 mt-0.5">{hint}</div>}
      </div>
      {action || <button className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>Edit</button>}
    </div>
  );
}
