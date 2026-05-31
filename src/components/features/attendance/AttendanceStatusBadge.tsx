"use client";

import React from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { ATTENDANCE_STATUS_CONFIG } from "@/constants/attendanceConfig";
import type { AttendanceDisplayStatus } from "@/types";

interface AttendanceStatusBadgeProps {
  status: AttendanceDisplayStatus;
  className?: string;
  style?: React.CSSProperties;
}

const statusTones: Record<AttendanceDisplayStatus, BadgeTone> = {
  not_clocked_in: "gray",
  working:        "in_service",
  on_break:       "amber",
  clocked_out:    "blue",
  late:           "amber",
  absent:         "rose",
  missed_clock_out: "rose",
  needs_review:   "amber",
};

export default function AttendanceStatusBadge({ status, className = "", style }: AttendanceStatusBadgeProps) {
  const tone = statusTones[status] || "gray";
  const config = ATTENDANCE_STATUS_CONFIG[status] || { label: status, color: "gray" };

  return (
    <Badge tone={tone} className={className} style={style} showDot={true}>
      {config.label}
    </Badge>
  );
}
