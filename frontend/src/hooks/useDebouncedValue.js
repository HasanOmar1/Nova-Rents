import { useEffect, useRef, useState } from "react";

export const useDebouncedValue = (
  value,
  delay = 300,
  onDebouncedChange,
) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const committedValueRef = useRef(value);
  const onChangeRef = useRef(onDebouncedChange);

  useEffect(() => {
    onChangeRef.current = onDebouncedChange;
  }, [onDebouncedChange]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (Object.is(committedValueRef.current, value)) return;

      const previousValue = committedValueRef.current;
      committedValueRef.current = value;
      setDebouncedValue(value);
      onChangeRef.current?.(value, previousValue);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [delay, value]);

  return debouncedValue;
};
