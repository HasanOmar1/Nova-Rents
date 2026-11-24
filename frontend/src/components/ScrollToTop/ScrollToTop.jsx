// Defines the Scroll To Top React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

// Renders the Scroll To Top interface.
// Takes no arguments and returns rendered JSX.
const ScrollToTop = () => {
  const { hash, key, pathname } = useLocation();

  useLayoutEffect(
    // Synchronizes layout-sensitive external state after rendering.
    // Takes no arguments and returns an optional cleanup function.
    () => {
      if (!hash) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return undefined;
      }

      const frame = window.requestAnimationFrame(
        // Runs deferred browser work on the next animation frame.
        // Takes no arguments and returns nothing.
        () => {
          let targetId = hash.slice(1);
          try {
            targetId = decodeURIComponent(targetId);
          } catch {
            // A malformed external URL should not prevent the destination page
            // from rendering; use the literal hash as a safe fallback.
          }
          const target = document.getElementById(targetId);
          if (target) {
            target.scrollIntoView({ block: "start" });
          } else {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
          }
        });

      // Synchronizes layout-sensitive external state after rendering.
      // Takes no arguments and returns an optional cleanup function.
      return () => window.cancelAnimationFrame(frame);
    }, [hash, key, pathname]);

  return null;
};

export default ScrollToTop;
