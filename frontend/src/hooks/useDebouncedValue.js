// Provides reusable React state and behavior for debounced value.
// It packages related lifecycle logic and controls for use by components.
import { useEffect, useRef, useState } from "react";

// Delays value updates until the configured quiet period has elapsed.
// Accepts a value, delay, and change callback and returns the debounced value.
export const useDebouncedValue = (
  value,
  delay = 300,
  onDebouncedChange,
) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const committedValueRef = useRef(value);
  const onChangeRef = useRef(onDebouncedChange);

  useEffect(
    // Synchronizes the component with an external effect after rendering.
    // Takes no arguments and returns an optional cleanup function.
    () => {
      onChangeRef.current = onDebouncedChange;
    }, [onDebouncedChange]);

  useEffect(
    // Synchronizes the component with an external effect after rendering.
    // Takes no arguments and returns an optional cleanup function.
    () => {
      const timeoutId = setTimeout(
        // Runs delayed work after the configured timeout elapses.
        // Takes no arguments and returns nothing.
        () => {
          if (Object.is(committedValueRef.current, value)) return;

          const previousValue = committedValueRef.current;
          committedValueRef.current = value;
          setDebouncedValue(value);
          onChangeRef.current?.(value, previousValue);
        }, delay);

      // Synchronizes the component with an external effect after rendering.
      // Takes no arguments and returns an optional cleanup function.
      return () => clearTimeout(timeoutId);
    }, [delay, value]);

  return debouncedValue;
};
