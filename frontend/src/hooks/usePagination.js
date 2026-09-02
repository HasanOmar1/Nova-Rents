// Provides reusable React state and behavior for pagination.
// It packages related lifecycle logic and controls for use by components.
import { useCallback, useState } from "react";

// Normalizes total pages into a consistent value.
// Accepts total pages and returns the computed result.
const normalizeTotalPages = (totalPages) => {
  const parsedTotal = Number(totalPages);

  return Number.isFinite(parsedTotal) && parsedTotal > 0
    ? Math.floor(parsedTotal)
    : 1;
};

// Restricts a requested page to the valid range for a known page count.
// Accepts a page and total pages and returns a bounded integer page number.
const clampPage = (page, totalPages) => {
  const parsedPage = Number(page);
  const safePage = Number.isFinite(parsedPage) ? Math.floor(parsedPage) : 1;

  return Math.min(Math.max(safePage, 1), totalPages);
};

// Manages a page that stays synchronized with dataset and boundary changes.
// Accepts pagination options and returns the page plus navigation actions.
export const usePagination = ({
  initialPage = 1,
  totalPages = 1,
  resetKey,
} = {}) => {
  const safeTotalPages = normalizeTotalPages(totalPages);
  const [paginationState, setPaginationState] = useState(
    // Runs the callback required by the surrounding operation.
    // Takes no arguments and returns the callback result.
    () => ({
    currentPage: clampPage(initialPage, safeTotalPages),
    totalPages: safeTotalPages,
    resetKey,
  }));
  const shouldReset = !Object.is(paginationState.resetKey, resetKey);
  const currentPage = shouldReset
    ? clampPage(initialPage, safeTotalPages)
    : clampPage(paginationState.currentPage, safeTotalPages);

  // Synchronize changed bounds or datasets before consumer effects can fetch.
  if (paginationState.totalPages !== safeTotalPages || shouldReset) {
    setPaginationState({
      currentPage,
      totalPages: safeTotalPages,
      resetKey,
    });
  }

  // Sets page for the current state.
  // Accepts value or updater and returns nothing.
  const setPage = useCallback(
    (valueOrUpdater) => {
      setPaginationState(
        // Derives the next state value from the current state.
        // Accepts previous state and returns the updated state value.
        (previousState) => {
          const boundedPreviousPage = clampPage(
            previousState.currentPage,
            safeTotalPages,
          );
          const nextPage =
            typeof valueOrUpdater === "function"
              ? valueOrUpdater(boundedPreviousPage)
              : valueOrUpdater;

          return {
            currentPage: clampPage(nextPage, safeTotalPages),
            totalPages: safeTotalPages,
            resetKey,
          };
        });
    },
    [resetKey, safeTotalPages],
  );

  // Advances the pagination state by one bounded page.
  // Takes no arguments and returns nothing.
  const nextPage = useCallback(() => {
    setPage(
      // Derives the next state value from the current state.
      // Accepts page and returns the updated state value.
      (page) => page + 1);
  }, [setPage]);

  // Moves the pagination state back by one bounded page.
  // Takes no arguments and returns nothing.
  const previousPage = useCallback(() => {
    setPage(
      // Derives the next state value from the current state.
      // Accepts page and returns the updated state value.
      (page) => page - 1);
  }, [setPage]);

  // Resets page to its initial state.
  // Takes no arguments and returns nothing.
  const resetPage = useCallback(() => {
    setPage(initialPage);
  }, [initialPage, setPage]);

  return {
    currentPage,
    nextPage,
    previousPage,
    resetPage,
  };
};
