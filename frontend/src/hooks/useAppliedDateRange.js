import { useCallback, useState } from "react";
import { useDateRange } from "./useDateRange";

export const useAppliedDateRange = (createInitialRange) => {
  const dateRange = useDateRange(createInitialRange);
  const { fromDate, toDate, isRangeValid, initialRange } = dateRange;
  const [appliedRange, setAppliedRange] = useState(initialRange);

  const applyDateRange = useCallback(() => {
    if (!isRangeValid) return false;

    setAppliedRange({ from: fromDate, to: toDate });
    return true;
  }, [fromDate, isRangeValid, toDate]);

  return {
    ...dateRange,
    appliedFromDate: appliedRange.from,
    appliedToDate: appliedRange.to,
    isRangeDirty:
      appliedRange.from !== fromDate || appliedRange.to !== toDate,
    applyDateRange,
  };
};
