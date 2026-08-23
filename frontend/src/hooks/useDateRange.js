import { useCallback, useState } from "react";
import { createRecentMonthRange } from "../utils/dateFormat";

const normalizeRange = (range) => ({
  from: range?.from || "",
  to: range?.to || "",
});

export const useDateRange = (createInitialRange = createRecentMonthRange) => {
  const [initialRange] = useState(() =>
    normalizeRange(
      typeof createInitialRange === "function"
        ? createInitialRange()
        : createInitialRange,
    ),
  );
  const [range, setRange] = useState(initialRange);

  const setFromDate = useCallback((from) => {
    setRange((currentRange) => ({ ...currentRange, from }));
  }, []);

  const setToDate = useCallback((to) => {
    setRange((currentRange) => ({ ...currentRange, to }));
  }, []);

  return {
    fromDate: range.from,
    toDate: range.to,
    setFromDate,
    setToDate,
    isRangeValid: Boolean(range.from && range.to && range.from <= range.to),
    initialRange,
  };
};
