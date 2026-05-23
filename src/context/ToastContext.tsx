"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

interface ToastContextType {
  show: (msg: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const show = useCallback((msg: string, durationMs = 2000) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setToast(msg);
    timeoutRef.current = setTimeout(() => {
      setToast(null);
      timeoutRef.current = null;
    }, durationMs);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div className="fixed bottom-[100px] left-1/2 -translate-x-1/2 bg-ink text-white p-[10px_16px] rounded-[10px] text-[13px] z-[9999] shadow-[0_12px_24px_-10px_rgba(0,0,0,0.3)] animate-[pop_0.2s_ease-out]">
          {toast}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
