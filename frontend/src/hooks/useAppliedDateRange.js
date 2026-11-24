// Provides reusable React state and behavior for applied date range.
// It packages related lifecycle logic and controls for use by components.
import { useCallback, useState } from "react";
import { useDateRange } from "./useDateRange";

// Separates an editable date range from the range committed to data queries.
// Accepts an initial-range factory and returns draft, applied, and action state.
export const useAppliedDateRange = (createInitialRange) => {
  const dateRange = useDateRange(createInitialRange);
  const { fromDate, toDate, isRangeValid, initialRange } = dateRange;
  const [appliedRange, setAppliedRange] = useState(initialRange);

  // Commits the draft dates only when they form a valid interval.
  // Takes no arguments and returns whether the range was applied.
  const applyDateRange = useCallback(() => {
    if (!isRangeValid) return false;

    setAppliedRange({ from: fromDate, to: toDate });
    return true;
  }, [fromDate, isRangeValid, toDate]);

  return {
    ...dateRange,
    appliedFromDate: appliedRange.from,
    appliedToDate: appliedRange.to,
    applyDateRange,
  };
};
