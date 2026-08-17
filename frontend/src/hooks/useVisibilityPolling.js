import { useEffect, useRef } from "react";

export const useVisibilityPolling = (
  callback,
  {
    enabled = true,
    intervalMs = 30000,
    refreshKey,
    runImmediately = true,
  } = {},
) => {
  const callbackRef = useRef(callback);
  const parsedInterval = Number(intervalMs);
  const safeIntervalMs =
    Number.isFinite(parsedInterval) && parsedInterval > 0
      ? parsedInterval
      : 30000;

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return undefined;

    let isRunning = false;

    const runCallback = async () => {
      if (isRunning) return;

      isRunning = true;
      try {
        await callbackRef.current();
      } finally {
        isRunning = false;
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void runCallback();
      }
    };

    if (runImmediately) {
      void runCallback();
    }

    const intervalId = window.setInterval(() => {
      void runCallback();
    }, safeIntervalMs);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [enabled, refreshKey, runImmediately, safeIntervalMs]);
};
