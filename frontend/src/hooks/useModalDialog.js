// Provides reusable React state and behavior for modal dialog.
// It packages related lifecycle logic and controls for use by components.
import { useEffect, useRef } from "react";

let bodyScrollLockCount = 0;
let previousBodyOverflow = "";

// Locks body scroll while the related UI is active.
// Takes no arguments and returns nothing.
const lockBodyScroll = () => {
  if (bodyScrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
  }

  bodyScrollLockCount += 1;
  document.body.style.overflow = "hidden";
};

// Unlocks body scroll after the related UI closes.
// Takes no arguments and returns nothing.
const unlockBodyScroll = () => {
  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);

  if (bodyScrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
    previousBodyOverflow = "";
  }
};

// Synchronizes a native dialog element with a Boolean open state.
// Accepts whether the modal is open and returns a ref for the dialog element.
export const useModalDialog = (isOpen) => {
  const dialogRef = useRef(null);

  useEffect(
    // Synchronizes the component with an external effect after rendering.
    // Takes no arguments and returns an optional cleanup function.
    () => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      if (isOpen && !dialog.open) {
        dialog.showModal();
      } else if (!isOpen && dialog.open) {
        dialog.close();
      }
    }, [isOpen]);

  useEffect(
    // Synchronizes the component with an external effect after rendering.
    // Takes no arguments and returns an optional cleanup function.
    () => {
      if (!isOpen) return;

      lockBodyScroll();
      return unlockBodyScroll;
    }, [isOpen]);

  return dialogRef;
};
