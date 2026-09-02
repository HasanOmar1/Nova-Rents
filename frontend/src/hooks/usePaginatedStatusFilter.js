// Provides reusable React state and behavior for paginated status filter.
// It packages related lifecycle logic and controls for use by components.
import { useCallback, useState } from "react";
import { usePagination } from "./usePagination";

// Manages a status selection and the pagination tied to its result set.
// Accepts initial status and page-count options and returns filter and page controls.
export const usePaginatedStatusFilter = ({
  initialStatus = "all",
  totalPages = 1,
} = {}) => {
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const pagination = usePagination({ totalPages });
  const { resetPage } = pagination;

  // Handles status change for the surrounding interface.
  // Accepts value or event and returns nothing.
  const handleStatusChange = useCallback(
    (valueOrEvent) => {
      const status = valueOrEvent?.target
        ? valueOrEvent.target.value
        : valueOrEvent;

      setStatusFilter(status);
      resetPage();
    },
    [resetPage],
  );

  return {
    ...pagination,
    statusFilter,
    handleStatusChange,
  };
};
