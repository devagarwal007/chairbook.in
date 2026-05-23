import { useState, useEffect } from "react";
import { formatDateDisplay } from "@/lib/utils";

export function useTimeUpdate(enabled: boolean) {
  const [nowTimeMin, setNowTimeMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  const [dateDisplayStr, setDateDisplayStr] = useState(() => {
    const d = new Date();
    return formatDateDisplay(d);
  });

  useEffect(() => {
    if (!enabled) return;

    const updateTime = () => {
      const now = new Date();
      setDateDisplayStr(formatDateDisplay(now));
      setNowTimeMin(now.getHours() * 60 + now.getMinutes());
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [enabled]);

  return { nowTimeMin, dateDisplayStr };
}
