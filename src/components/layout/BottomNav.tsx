"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/constants/common";

export default function BottomNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  const activeIndex = pathname === "/dashboard/block-time"
    ? 1
    : navItems.findIndex((item) =>
        item.exact ? pathname === item.href : pathname?.startsWith(item.href)
      );

  const updatePill = useCallback(() => {
    const el = itemRefs.current[activeIndex];
    const nav = navRef.current;
    if (el && nav) {
      const navRect = nav.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setPill({
        left: elRect.left - navRect.left,
        width: elRect.width,
      });
    }
  }, [activeIndex]);

  useEffect(() => {
    // Small delay to allow layout to settle after route change
    const raf = requestAnimationFrame(updatePill);
    const nav = navRef.current;
    if (!nav) return;
    const ro = new ResizeObserver(updatePill);
    ro.observe(nav);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [updatePill]);

  return (
    <nav className="bottom-nav" ref={navRef}>
      {/* Sliding pill indicator */}
      {pill && (
        <div
          className="bn-active-pill"
          style={{
            transform: `translateX(${pill.left}px)`,
            width: pill.width,
          }}
        />
      )}
      {navItems.map((item, i) => {
        const Icon = item.icon;
        const isActive = activeIndex === i;
        return (
          <Link
            key={item.href}
            href={item.href}
            ref={(el) => { itemRefs.current[i] = el; }}
            className={`bn-item ${isActive ? "active" : ""}`}
          >
            <Icon />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
