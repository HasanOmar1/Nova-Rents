import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import axios from "axios";
import { useActivityContext } from "./ActivityContext";

const ReportedUsersContext = createContext(null);

const ReportedUsersProvider = ({ children }) => {
  const { loadActivities } = useActivityContext();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    accountStatus: "all",
    complaintStatus: "all",
    sortBy: "total_reports",
  });
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [details, setDetails] = useState([]);
  const [reason, setReason] = useState("");
  const [warningError, setWarningError] = useState("");
  const [message, setMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(filters.search.trim()), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const load = useCallback(
    async (page = 1) => {
      try {
        const { data } = await axios.get("/reported-users", {
          params: {
            page,
            limit: 10,
            search: query,
            accountStatus: filters.accountStatus,
            complaintStatus: filters.complaintStatus,
            sortBy: filters.sortBy,
          },
        });
        setUsers(data.users || []);
        setPagination(
          data.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalUsers: 0,
          },
        );
        setMessage("");
        return true;
      } catch (error) {
        setMessage(
          error.response?.data?.message || "Failed to load reported users",
        );
        return false;
      }
    },
    [query, filters.accountStatus, filters.complaintStatus, filters.sortBy],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const openDetails = async (user, type) => {
    setLoadingAction(`${type}-${user.userId}`);
    try {
      const endpoint = type === "reports" ? "reports" : "warnings";
      const { data } = await axios.get(
        `/reported-users/${user.userId}/${endpoint}`,
      );
      setDetails(data[endpoint] || []);
      setModal({ type, user });
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load details");
    } finally {
      setLoadingAction("");
    }
  };

  const issueWarning = async () => {
    if (!modal?.user) return;

    const clean = reason.trim();
    setLoadingAction(`warn-${modal.user.userId}`);
    try {
      const { data } = await axios.post(
        `/reported-users/${modal.user.userId}/warnings`,
        { reason: clean },
      );
      setModal(null);
      setReason("");
      setWarningError("");
      await Promise.all([load(1), loadActivities()]);
      setMessage(
        `${data.message}${data.emailSent ? "" : " (email delivery failed)"}`,
      );
    } catch (error) {
      setWarningError(
        error.response?.data?.message || "Failed to issue warning",
      );
    } finally {
      setLoadingAction("");
    }
  };

  const changeStatus = async (user, block) => {
    setLoadingAction(`status-${user.userId}`);
    try {
      const { data } = await axios.post(
        `/users/${block ? "block" : "unblock"}/${encodeURIComponent(user.email)}`,
      );
      await Promise.all([load(1), loadActivities()]);
      setMessage(data.message);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update account");
    } finally {
      setModal(null);
      setLoadingAction("");
    }
  };

  const removeLatestWarning = async (user) => {
    setLoadingAction(`remove-${user.userId}`);
    try {
      const { data } = await axios.delete(
        `/reported-users/${user.userId}/warnings/latest`,
      );
      await Promise.all([load(1), loadActivities()]);
      setMessage(data.message);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to remove warning");
    } finally {
      setModal(null);
      setLoadingAction("");
    }
  };

  return (
    <ReportedUsersContext.Provider
      value={{
        users,
        pagination,
        filters,
        setFilters,
        modal,
        setModal,
        details,
        reason,
        setReason,
        warningError,
        setWarningError,
        message,
        loadingAction,
        load,
        openDetails,
        issueWarning,
        changeStatus,
        removeLatestWarning,
      }}
    >
      {children}
    </ReportedUsersContext.Provider>
  );
};

// Keep the provider and its consumer hook together, matching the project's
// existing context-module convention.
// eslint-disable-next-line react-refresh/only-export-components
export const useReportedUsersContext = () => {
  const context = useContext(ReportedUsersContext);

  if (!context) {
    throw new Error(
      "useReportedUsersContext must be used within a ReportedUsersProvider",
    );
  }

  return context;
};

export default ReportedUsersProvider;
