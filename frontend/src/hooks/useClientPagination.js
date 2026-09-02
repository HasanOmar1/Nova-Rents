// Provides reusable React state and behavior for client pagination.
// It packages related lifecycle logic and controls for use by components.
import { usePagination } from "./usePagination";

// Normalizes page size into a consistent value.
// Accepts page size and returns the computed result.
const normalizePageSize = (pageSize) => {
  const parsedPageSize = Number(pageSize);

  return Number.isFinite(parsedPageSize) && parsedPageSize > 0
    ? Math.floor(parsedPageSize)
    : 1;
};

// Paginates an in-memory collection using the shared bounded page state.
// Accepts items and pagination options and returns the current slice and controls.
export const useClientPagination = ({
  items = [],
  pageSize = 10,
  initialPage = 1,
  resetKey,
} = {}) => {
  const safeItems = Array.isArray(items) ? items : [];
  const safePageSize = normalizePageSize(pageSize);
  const totalPages = Math.ceil(safeItems.length / safePageSize);
  const pagination = usePagination({ initialPage, totalPages, resetKey });
  const startIndex = (pagination.currentPage - 1) * safePageSize;

  return {
    ...pagination,
    paginatedItems: safeItems.slice(startIndex, startIndex + safePageSize),
    totalPages,
    pageSize: safePageSize,
  };
};
