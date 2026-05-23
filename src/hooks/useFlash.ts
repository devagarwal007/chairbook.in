import { useState, useCallback, useRef, useEffect } from "react";

export function useFlash(durationMs = 2000) {
  const [flash, setFlash] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const show = useCallback(
    (msg: string, customDurationMs?: number) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setFlash(msg);
      timeoutRef.current = setTimeout(() => {
        setFlash(null);
        timeoutRef.current = null;
      }, customDurationMs ?? durationMs);
    },
    [durationMs]
  );

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setFlash(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { flash, show, clear };
}
