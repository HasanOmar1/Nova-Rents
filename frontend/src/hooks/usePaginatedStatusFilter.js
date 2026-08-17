import { useCallback, useState } from "react";

export const usePaginatedStatusFilter = (initialStatus = "all") => {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  const handleStatusChange = useCallback((valueOrEvent) => {
    const status = valueOrEvent?.target
      ? valueOrEvent.target.value
      : valueOrEvent;

    setStatusFilter(status);
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    setCurrentPage,
    statusFilter,
    handleStatusChange,
  };
};
