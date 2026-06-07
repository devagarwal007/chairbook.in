"use client";

import dynamic from "next/dynamic";

const AttendanceSettingsForm = dynamic(() => import("@/components/features/attendance/AttendanceSettingsForm"), {
  loading: () => <div className="animate-pulse bg-bg-2 rounded-xl h-[200px]" />,
});

type AttendanceTabProps = {
  salonId: string | null;
};

export default function AttendanceTab({ salonId }: AttendanceTabProps) {
  return <AttendanceSettingsForm salonId={salonId} />;
}
