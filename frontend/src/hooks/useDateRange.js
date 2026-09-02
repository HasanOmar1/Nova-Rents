// Provides reusable React state and behavior for date range.
// It packages related lifecycle logic and controls for use by components.
import { useCallback, useState } from "react";
import { createRecentMonthRange } from "../utils/dateFormat";

// Normalizes range into a consistent value.
// Accepts range and returns the computed result.
const normalizeRange = (range) => ({
  from: range?.from || "",
  to: range?.to || "",
});

// Manages an editable date range while retaining its initial endpoints.
// Accepts an initial-range factory or value and returns dates, setters, and validity.
export const useDateRange = (createInitialRange = createRecentMonthRange) => {
  const [initialRange] = useState(
    // Runs the callback required by the surrounding operation.
    // Takes no arguments and returns the callback result.
    () =>
    normalizeRange(
      typeof createInitialRange === "function"
        ? createInitialRange()
        : createInitialRange,
    ),
  );
  const [range, setRange] = useState(initialRange);

  // Sets from date for the current state.
  // Accepts from and returns nothing.
  const setFromDate = useCallback((from) => {
    setRange(
      // Derives the next state value from the current state.
      // Accepts current range and returns the updated state value.
      (currentRange) => ({ ...currentRange, from }));
  }, []);

  // Sets to date for the current state.
  // Accepts to and returns nothing.
  const setToDate = useCallback((to) => {
    setRange(
      // Derives the next state value from the current state.
      // Accepts current range and returns the updated state value.
      (currentRange) => ({ ...currentRange, to }));
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
