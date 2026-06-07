import type { ReactNode } from "react";

interface SectionHeadProps {
  title: string;
  desc?: string;
  action?: ReactNode;
}

export default function SectionHead({ title, desc, action }: SectionHeadProps) {
  return (
    <div className="flex justify-between items-end gap-4 mb-1.5">
      <div>
        <h2 className="text-sm font-semibold tracking-[0.04em] uppercase text-ink-3 m-0">{title}</h2>
        {desc && <p className="text-xs text-ink-3 mt-1">{desc}</p>}
      </div>
      {action}
    </div>
  );
}
