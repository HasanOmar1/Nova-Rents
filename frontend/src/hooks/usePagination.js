import { useCallback, useState } from "react";

const normalizeTotalPages = (totalPages) => {
  const parsedTotal = Number(totalPages);

  return Number.isFinite(parsedTotal) && parsedTotal > 0
    ? Math.floor(parsedTotal)
    : 1;
};

const clampPage = (page, totalPages) => {
  const parsedPage = Number(page);
  const safePage = Number.isFinite(parsedPage) ? Math.floor(parsedPage) : 1;

  return Math.min(Math.max(safePage, 1), totalPages);
};

export const usePagination = ({
  initialPage = 1,
  totalPages = 1,
  resetKey,
} = {}) => {
  const safeTotalPages = normalizeTotalPages(totalPages);
  const [paginationState, setPaginationState] = useState(() => ({
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

  const setPage = useCallback(
    (valueOrUpdater) => {
      setPaginationState((previousState) => {
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

  const nextPage = useCallback(() => {
    setPage((page) => page + 1);
  }, [setPage]);

  const previousPage = useCallback(() => {
    setPage((page) => page - 1);
  }, [setPage]);

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
