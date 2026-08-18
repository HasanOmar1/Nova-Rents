import { useCallback, useState } from "react";
import { usePagination } from "./usePagination";

export const usePaginatedStatusFilter = ({
  initialStatus = "all",
  totalPages = 1,
} = {}) => {
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const pagination = usePagination({ totalPages });
  const { resetPage } = pagination;

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
