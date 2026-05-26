"use client";

import React, { useState } from "react";
import StylistShell from "@/components/layout/StylistShell";
import { Avatar, Icons as I } from "@/components/ui";

export default function StylistClientsPage() {
  const [query, setQuery] = useState("");

  return (
    <StylistShell title="My clients" subtitle="CUSTOMERS WHO BOOKED YOU">
      {({ clients, loading }) => {
        const q = query.trim().toLowerCase();
        const filtered = q
          ? clients.filter((client) =>
              client.name.toLowerCase().includes(q)
              || client.phone.includes(q)
              || client.lastService.toLowerCase().includes(q)
            )
          : clients;

        return (
          <main className="max-w-[900px] mx-auto px-4 md:px-8 py-7">
            <div className="flex items-center gap-2.5 bg-white border border-line-2 rounded-[var(--radius)] px-3.5 py-2.5 mb-4">
              <I.search />
              <input
                placeholder="Search my clients..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="flex-1 border-0 outline-0 text-sm font-sans bg-transparent"
              />
              {query && <button className="border-0 bg-transparent cursor-pointer text-ink-3" onClick={() => setQuery("")}><I.x /></button>}
            </div>

            {loading ? (
              <div className="flex flex-col gap-2.5">
                {[1, 2, 3, 4].map((item) => <div key={item} className="h-[74px] bg-bg-2 rounded-xl animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white border border-line rounded-xl p-8 text-center">
                <div className="w-11 h-11 rounded-full bg-bg-2 grid place-items-center mx-auto text-ink-3"><I.users /></div>
                <div className="font-semibold mt-3">No clients found</div>
                <div className="text-sm text-ink-3 mt-1">Only customers who booked you appear here.</div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {filtered.map((client) => (
                  <div key={client.id} className="bg-white border border-line rounded-xl p-3.5 flex items-center gap-3">
                    <Avatar initials={client.initials} tone={client.tone} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{client.name}</div>
                      <div className="text-xs text-ink-3 mt-0.5 truncate">{client.phone || "No phone"} · Last: {client.lastService}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-teal">{client.visits}</div>
                      <div className="text-[10px] text-ink-3 uppercase tracking-[0.04em]">visits</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        );
      }}
    </StylistShell>
  );
}
