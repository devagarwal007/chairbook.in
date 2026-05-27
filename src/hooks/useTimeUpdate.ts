import { useState, useEffect } from "react";
import { formatDateDisplay } from "@/lib/utils";

const HYDRATION_SAFE_TIME_MIN = 12 * 60;

export function useTimeUpdate(enabled: boolean) {
  const [nowTimeMin, setNowTimeMin] = useState(HYDRATION_SAFE_TIME_MIN);
  const [dateDisplayStr, setDateDisplayStr] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const updateTime = () => {
      const now = new Date();
      setDateDisplayStr(formatDateDisplay(now));
      setNowTimeMin(now.getHours() * 60 + now.getMinutes());
      setIsReady(true);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [enabled]);

  return { nowTimeMin, dateDisplayStr, isReady };
}
