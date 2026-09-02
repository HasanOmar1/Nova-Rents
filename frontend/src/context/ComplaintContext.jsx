// Provides shared complaint state and API operations through React context.
// It exports a provider component and a hook for consuming the managed data.
import { createContext, useCallback, useContext, useState } from "react";
import axios from "axios";
import { useActivityContext } from "./ActivityContext";

const ComplaintContext = createContext();

// Supplies complaint data and reporting actions to descendant components.
// Accepts children and returns a complaint-context provider tree.
const ComplaintContextProvider = ({ children }) => {
  const { loadActivities } = useActivityContext();
  const [complaints, setComplaints] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [pagination, setPagination] = useState({});
  const [complaintStats, setComplaintStats] = useState({});
  const [complaintTrendsData, setComplaintTrendsData] = useState([]);
  const [isComplaintTrendsLoading, setIsComplaintTrendsLoading] =
    useState(false);
  const [complaintTrendsErrorMsg, setComplaintTrendsErrorMsg] = useState("");

  // Personal "Previous complaints" list — separate from the admin table
  // so getAllComplaints and getMyComplaints never overwrite each other.
  const [myComplaints, setMyComplaints] = useState([]);
  const [myComplaintsPagination, setMyComplaintsPagination] = useState({});
  const [isMyComplaintsLoading, setIsMyComplaintsLoading] = useState(false);
  const [myComplaintsError, setMyComplaintsError] = useState("");

  // Active vehicle reports against the logged-in owner's listings (My Vehicles).
  const [ownerVehicleReports, setOwnerVehicleReports] = useState([]);

  // Owner-type complaints where the session user is the reported target.
  const [reportsAboutMe, setReportsAboutMe] = useState([]);
  const [reportsAboutMePagination, setReportsAboutMePagination] = useState({});
  const [isReportsAboutMeLoading, setIsReportsAboutMeLoading] = useState(false);
  const [reportsAboutMeError, setReportsAboutMeError] = useState("");

  // Vehicle-type complaints against listings owned by the session user.
  // This is an all-status, paginated history and intentionally remains
  // separate from ownerVehicleReports, which only powers active-report badges.
  const [reportsAboutMyVehicles, setReportsAboutMyVehicles] = useState([]);
  const [reportsAboutMyVehiclesPagination, setReportsAboutMyVehiclesPagination] =
    useState({});
  const [isReportsAboutMyVehiclesLoading, setIsReportsAboutMyVehiclesLoading] =
    useState(false);
  const [reportsAboutMyVehiclesError, setReportsAboutMyVehiclesError] =
    useState("");

  // Creates complaint for the current workflow.
  // Accepts complaint data and returns a promise for the operation result.
  const createComplaint = async (complaintData) => {
    try {
      await axios.post("/complaints", complaintData);
      await loadActivities();
      setErrorMsg("");
      return true;
    } catch (error) {
      setErrorMsg(error?.response?.data?.message);
      return false;
    }
  };

  // Retrieves my complaints for the current workflow.
  // Accepts an options object and returns a promise for the operation result.
  const getMyComplaints = async ({
    startDate,
    endDate,
    status = "all",
    page = 1,
    limit = 5,
  } = {}) => {
    try {
      setIsMyComplaintsLoading(true);
      const response = await axios.get("/complaints/my", {
        params: { startDate, endDate, status, page, limit },
      });
      setMyComplaints(response.data.complaints || []);
      setMyComplaintsPagination(response.data.pagination || {});
      setMyComplaintsError("");
    } catch (error) {
      setMyComplaintsError(
        error?.response?.data?.message || "Failed to load your complaints",
      );
      setMyComplaints([]);
    } finally {
      setIsMyComplaintsLoading(false);
    }
  };

  // Updates a complaint's status and optional review details through the API.
  // Accepts complaint ID, status, and payload and returns a promise for the result.
  const putUpdateComplaintStatus = async (complaintId, status, payload = {}) => {
    try {
      const resolutionMessage =
        typeof payload === "string"
          ? payload
          : (payload.resolutionMessage ?? payload.responseToUser ?? "");
      const adminNotes =
        typeof payload === "string" ? "" : (payload.adminNotes ?? "");

      const response = await axios.put(`/complaints/${complaintId}/status`, {
        status,
        resolutionMessage,
        adminNotes,
        // Temporary alias until all callers use resolutionMessage.
        responseToUser: resolutionMessage,
      });
      setErrorMsg("");
      return response.data;
    } catch (error) {
      setErrorMsg(error?.response?.data?.message);
      return null;
    }
  };

  // Retrieves all complaints for the current workflow.
  // Accepts page and status and returns a promise for the operation result.
  const getAllComplaints = async (page = 1, status = "all") => {
    try {
      const response = await axios.get(
        `/complaints?page=${page}&status=${status}&limit=5`,
      );
      setComplaints(response.data.complaints);
      setPagination(response.data.pagination);
      setComplaintStats(response.data.stats);
      setErrorMsg("");
    } catch (error) {
      setErrorMsg(error?.response?.data?.message);
    }
  };

  // Chart data for the admin Complaint Trends chart. Independent from the
  // paginated complaints table so page changes never refetch or skew it.

  // Retrieves complaint trends for the current workflow.
  // Accepts start date, end date, and status and returns a promise for the operation result.
  const getComplaintTrends = async (startDate, endDate, status = "all") => {
    try {
      setIsComplaintTrendsLoading(true);
      const response = await axios.get(
        `/complaints/trends?startDate=${startDate}&endDate=${endDate}&status=${status}`,
      );
      setComplaintTrendsData(response.data.chartData);
      setComplaintTrendsErrorMsg("");
    } catch (error) {
      setComplaintTrendsErrorMsg(
        error?.response?.data?.message || "Failed to load complaint trends",
      );
    } finally {
      setIsComplaintTrendsLoading(false);
    }
  };

  // Retrieves owner vehicle reports for the current workflow.
  // Takes no arguments and returns a promise for the operation result.
  const getOwnerVehicleReports = async () => {
    try {
      const response = await axios.get("/complaints/owner-vehicle-reports");
      setOwnerVehicleReports(response.data.reports || []);
      return response.data.reports || [];
    } catch {
      setOwnerVehicleReports([]);
      return [];
    }
  };

  // Retrieves owner vehicle report history for the current workflow.
  // Accepts license plate and returns a promise for the operation result.
  const getOwnerVehicleReportHistory = useCallback(async (licensePlate) => {
    try {
      const response = await axios.get(
        `/complaints/owner-vehicle-reports/${encodeURIComponent(licensePlate)}`,
      );
      return response.data.reports || [];
    } catch (error) {
      throw new Error(
        error?.response?.data?.message || "Failed to load vehicle reports",
      );
    }
  }, []);

  // Retrieves reports about me for the current workflow.
  // Accepts an options object and returns a promise for the operation result.
  const getReportsAboutMe = async ({ page = 1, limit = 5 } = {}) => {
    try {
      setIsReportsAboutMeLoading(true);
      const response = await axios.get("/complaints/about-me", {
        params: { page, limit },
      });
      setReportsAboutMe(response.data.reports || []);
      setReportsAboutMePagination(response.data.pagination || {});
      setReportsAboutMeError("");
      return response.data.reports || [];
    } catch (error) {
      setReportsAboutMe([]);
      setReportsAboutMePagination({});
      setReportsAboutMeError(
        error?.response?.data?.message || "Failed to load reports about you",
      );
      return [];
    } finally {
      setIsReportsAboutMeLoading(false);
    }
  };

  // Retrieves reports about my vehicles for the current workflow.
  // Accepts an options object and returns a promise for the operation result.
  const getReportsAboutMyVehicles = useCallback(
    async ({ page = 1, limit = 5 } = {}) => {
      try {
        setIsReportsAboutMyVehiclesLoading(true);
        const response = await axios.get("/complaints/about-my-vehicles", {
          params: { page, limit },
        });
        setReportsAboutMyVehicles(response.data.reports || []);
        setReportsAboutMyVehiclesPagination(response.data.pagination || {});
        setReportsAboutMyVehiclesError("");
        return response.data.reports || [];
      } catch (error) {
        setReportsAboutMyVehicles([]);
        setReportsAboutMyVehiclesPagination({});
        setReportsAboutMyVehiclesError(
          error?.response?.data?.message ||
            "Failed to load reports about your vehicles",
        );
        return [];
      } finally {
        setIsReportsAboutMyVehiclesLoading(false);
      }
    },
    [],
  );

  return (
    <ComplaintContext.Provider
      value={{
        complaints,
        errorMsg,
        setErrorMsg,
        createComplaint,
        getMyComplaints,
        myComplaints,
        myComplaintsPagination,
        isMyComplaintsLoading,
        myComplaintsError,
        putUpdateComplaintStatus,
        getAllComplaints,
        pagination,
        complaintStats,
        complaintTrendsData,
        isComplaintTrendsLoading,
        complaintTrendsErrorMsg,
        getComplaintTrends,
        ownerVehicleReports,
        getOwnerVehicleReports,
        getOwnerVehicleReportHistory,
        reportsAboutMe,
        reportsAboutMePagination,
        isReportsAboutMeLoading,
        reportsAboutMeError,
        getReportsAboutMe,
        reportsAboutMyVehicles,
        reportsAboutMyVehiclesPagination,
        isReportsAboutMyVehiclesLoading,
        reportsAboutMyVehiclesError,
        getReportsAboutMyVehicles,
      }}
    >
      {children}
    </ComplaintContext.Provider>
  );
};

// Reads complaint data and actions exposed by the nearest provider.
// Takes no arguments and returns the current complaint context value.
export const useComplaintContext = () => useContext(ComplaintContext);
export default ComplaintContextProvider;
