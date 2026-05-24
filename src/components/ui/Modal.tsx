"use client";

import React from "react";
import { Icons as I } from "@/components/ui/Icons";

export interface ModalProps {
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export function Modal({
  isOpen = true,
  onClose,
  title,
  children,
  footer,
  width,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-back" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={width ? { width } : undefined}
      >
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <I.x className="w-4 h-4" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
