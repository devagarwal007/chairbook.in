"use client";

import { useState } from "react";
import { Icons as I, Modal } from "@/components/ui";
import { TEMPLATES } from "@/constants/customers";

interface MessageModalProps {
  customer: { name: string };
  onClose: () => void;
  onSend: (body: string) => void;
}

export default function MessageModal({ customer, onClose, onSend }: MessageModalProps) {
  const [tpl, setTpl] = useState("thanks");
  const [body, setBody] = useState(TEMPLATES[0].body);

  const select = (id: string) => {
    setTpl(id);
    const t = TEMPLATES.find(x => x.id === id);
    if (t) setBody(t.body);
  };

  return (
    <Modal
      title={`WhatsApp ${customer.name}`}
      onClose={onClose}
      width="min(500px, 92%)"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="bg-wa text-[#052B11] border-0 rounded-[10px] px-4 h-10 font-medium inline-flex items-center gap-2 cursor-pointer hover:bg-[#1FBA5A]"
            onClick={() => { onSend(body); onClose(); }}
            disabled={!body.trim()}
          >
            <I.wa /> Send on WhatsApp
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-ink-3">Pick a template</label>
          <div className="flex flex-col gap-1.5">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                className={`text-left p-[10px_14px] rounded-[10px] border font-inherit text-[13px] text-ink-2 cursor-pointer font-medium transition-[border-color,background,color] duration-150 ${
                  tpl === t.id ? "border-teal bg-teal-soft text-teal-ink" : "border-line bg-white hover:border-line-2"
                }`}
                onClick={() => select(t.id)}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-ink-3">Message preview</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Type your message..."
            className="w-full h-[110px] rounded-[8px] border border-line-2 p-[12px_14px] text-[14px] font-sans resize-y outline-0 focus:border-teal"
          />
          <div className="text-[11px] text-ink-3 mt-1">{body.length} characters</div>
        </div>
      </div>
    </Modal>
  );
}
