import { useEffect, useRef } from "react";

let bodyScrollLockCount = 0;
let previousBodyOverflow = "";

const lockBodyScroll = () => {
  if (bodyScrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
  }

  bodyScrollLockCount += 1;
  document.body.style.overflow = "hidden";
};

const unlockBodyScroll = () => {
  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);

  if (bodyScrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
    previousBodyOverflow = "";
  }
};

export const useModalDialog = (
  isOpen,
  { lockBodyScroll: shouldLockBodyScroll = false } = {},
) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !shouldLockBodyScroll) return;

    lockBodyScroll();
    return unlockBodyScroll;
  }, [isOpen, shouldLockBodyScroll]);

  return dialogRef;
};
