"use client";

import React from "react";
import StylistBottomNav from "@/components/layout/StylistBottomNav";
import StylistHeader from "@/components/layout/StylistHeader";
import { ToastProvider } from "@/context/ToastContext";
import { useStylistWorkspace } from "@/hooks";

interface StylistShellProps {
  title: string;
  subtitle?: string;
  children: (workspace: ReturnType<typeof useStylistWorkspace>) => React.ReactNode;
}

export default function StylistShell({ title, subtitle, children }: StylistShellProps) {
  const workspace = useStylistWorkspace();

  return (
    <ToastProvider>
      <div className="min-h-screen pb-[calc(var(--bottom-nav-h)+32px)] animate-[fadeIn_0.22s_cubic-bezier(0.16,1,0.3,1)_forwards]">
        <StylistHeader title={title} subtitle={subtitle} profile={workspace.profile} unreadCount={workspace.unreadCount} />
        {workspace.error ? (
          <main className="max-w-[760px] mx-auto px-4 md:px-8 py-10">
            <div className="bg-white border border-line rounded-xl p-6 text-center">
              <div className="text-base font-semibold text-ink">Account needs attention</div>
              <div className="text-sm text-ink-3 mt-2">{workspace.error}</div>
            </div>
          </main>
        ) : (
          children(workspace)
        )}
        <StylistBottomNav />
      </div>
    </ToastProvider>
  );
}
