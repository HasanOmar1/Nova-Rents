import { usePagination } from "./usePagination";

const normalizePageSize = (pageSize) => {
  const parsedPageSize = Number(pageSize);

  return Number.isFinite(parsedPageSize) && parsedPageSize > 0
    ? Math.floor(parsedPageSize)
    : 1;
};

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
