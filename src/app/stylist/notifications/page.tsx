"use client";

import React from "react";
import StylistShell from "@/components/layout/StylistShell";
import { Icons as I } from "@/components/ui";

function timeLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function StylistNotificationsPage() {
  return (
    <StylistShell title="My notifications" subtitle="ASSIGNED TO YOU">
      {({ notifications, loading, markNotificationRead }) => (
        <main className="max-w-[760px] mx-auto px-4 md:px-8 py-7">
          {loading ? (
            <div className="flex flex-col gap-2.5">
              {[1, 2, 3].map((item) => <div key={item} className="h-[74px] bg-bg-2 rounded-xl animate-pulse" />)}
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white border border-line rounded-xl p-8 text-center">
              <div className="w-11 h-11 rounded-full bg-bg-2 grid place-items-center mx-auto text-ink-3"><I.bell /></div>
              <div className="font-semibold mt-3">You&apos;re all caught up</div>
              <div className="text-sm text-ink-3 mt-1">Only notifications assigned to your stylist account show here.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {notifications.map((item) => (
                <button
                  key={item.id}
                  onClick={() => markNotificationRead(item.id)}
                  className={`w-full text-left bg-white border rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-colors duration-150 ${
                    item.read ? "border-line" : "border-teal bg-teal-soft/30"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-[10px] grid place-items-center shrink-0 ${item.read ? "bg-bg-2 text-ink-3" : "bg-teal-soft text-teal"}`}>
                    <I.bell />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink flex items-center gap-2">
                      {!item.read && <span className="w-1.5 h-1.5 rounded-full bg-teal" />}
                      {item.title}
                    </div>
                    <div className="text-xs text-ink-3 mt-1 truncate">{item.body}</div>
                  </div>
                  <div className="text-[11px] text-ink-4 font-mono whitespace-nowrap">{timeLabel(item.createdAt)}</div>
                </button>
              ))}
            </div>
          )}
        </main>
      )}
    </StylistShell>
  );
}
