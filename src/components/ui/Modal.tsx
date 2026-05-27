"use client";

import React from "react";
import { createPortal } from "react-dom";
import { Icons as I } from "@/components/ui/Icons";

export interface ModalProps {
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  className?: string;
  bodyClassName?: string;
  subtitle?: React.ReactNode;
  beforeBody?: React.ReactNode;
}

export function Modal({
  isOpen = true,
  onClose,
  title,
  children,
  footer,
  width,
  className,
  bodyClassName,
  subtitle,
  beforeBody,
}: ModalProps) {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="modal-back !fixed !inset-0 !w-[100vw] !h-[100dvh] !z-[9000]"
      onClick={onClose}
    >
      <div
        className={`modal${className ? ` ${className}` : ""}`}
        onClick={(e) => e.stopPropagation()}
        style={width ? { width } : undefined}
      >
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <div className="modal-subtitle">{subtitle}</div>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <I.x className="w-4 h-4" />
          </button>
        </div>
        {beforeBody}
        <div className={`modal-body${bodyClassName ? ` ${bodyClassName}` : ""}`}>{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
