// Provides reusable React state and behavior for visibility polling.
// It packages related lifecycle logic and controls for use by components.
import { useEffect, useRef } from "react";

// Polls the supplied callback while enabled and refreshes when visibility returns.
// Accepts a callback and polling options and returns nothing.
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

  useEffect(
    // Synchronizes the component with an external effect after rendering.
    // Takes no arguments and returns an optional cleanup function.
    () => {
      callbackRef.current = callback;
    }, [callback]);

  useEffect(
    // Synchronizes the component with an external effect after rendering.
    // Takes no arguments and returns an optional cleanup function.
    () => {
      if (!enabled) return undefined;

      let isRunning = false;

      // Runs callback for the current workflow.
      // Takes no arguments and returns a promise for the operation result.
      const runCallback = async () => {
        if (isRunning) return;

        isRunning = true;
        try {
          await callbackRef.current();
        } finally {
          isRunning = false;
        }
      };
      // Runs a refresh when the document becomes visible or the window gains focus.
      // Takes no arguments and returns nothing.
      const refreshWhenVisible = () => {
        if (document.visibilityState === "visible") {
          void runCallback();
        }
      };

      if (runImmediately) {
        void runCallback();
      }

      const intervalId = window.setInterval(
        // Runs the polling task on each configured interval.
        // Takes no arguments and returns nothing.
        () => {
          void runCallback();
        }, safeIntervalMs);
      window.addEventListener("focus", refreshWhenVisible);
      document.addEventListener("visibilitychange", refreshWhenVisible);

      // Synchronizes the component with an external effect after rendering.
      // Takes no arguments and returns an optional cleanup function.
      return () => {
        window.clearInterval(intervalId);
        window.removeEventListener("focus", refreshWhenVisible);
        document.removeEventListener("visibilitychange", refreshWhenVisible);
      };
    }, [enabled, refreshKey, runImmediately, safeIntervalMs]);
};
