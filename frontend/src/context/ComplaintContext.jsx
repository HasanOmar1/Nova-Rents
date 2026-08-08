import React, { createContext, useContext, useState } from "react";
import axios from "axios";

const ComplaintContext = createContext();

const ComplaintContextProvider = ({ children }) => {
  const [complaints, setComplaints] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [pagination, setPagination] = useState({});
  const [complaintStats, setComplaintStats] = useState({});
  const [complaintTrendsData, setComplaintTrendsData] = useState([]);
  const [complaintTrendsGranularity, setComplaintTrendsGranularity] =
    useState("month");
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
  const [isOwnerVehicleReportsLoading, setIsOwnerVehicleReportsLoading] =
    useState(false);
  const [ownerVehicleReportsError, setOwnerVehicleReportsError] = useState("");

  // Owner-type complaints where the session user is the reported target.
  const [reportsAboutMe, setReportsAboutMe] = useState([]);
  const [isReportsAboutMeLoading, setIsReportsAboutMeLoading] = useState(false);
  const [reportsAboutMeError, setReportsAboutMeError] = useState("");

  const createComplaint = async (complaintData) => {
    try {
      await axios.post("/complaints", complaintData);
      setErrorMsg("");
      return true;
    } catch (error) {
      setErrorMsg(error?.response?.data?.message);
      return false;
    }
  };

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
  const getComplaintTrends = async (startDate, endDate, status = "all") => {
    try {
      setIsComplaintTrendsLoading(true);
      const response = await axios.get(
        `/complaints/trends?startDate=${startDate}&endDate=${endDate}&status=${status}`,
      );
      setComplaintTrendsData(response.data.chartData);
      setComplaintTrendsGranularity(response.data.granularity);
      setComplaintTrendsErrorMsg("");
    } catch (error) {
      setComplaintTrendsErrorMsg(
        error?.response?.data?.message || "Failed to load complaint trends",
      );
    } finally {
      setIsComplaintTrendsLoading(false);
    }
  };

  const getOwnerVehicleReports = async () => {
    try {
      setIsOwnerVehicleReportsLoading(true);
      const response = await axios.get("/complaints/owner-vehicle-reports");
      setOwnerVehicleReports(response.data.reports || []);
      setOwnerVehicleReportsError("");
      return response.data.reports || [];
    } catch (error) {
      setOwnerVehicleReports([]);
      setOwnerVehicleReportsError(
        error?.response?.data?.message || "Failed to load vehicle reports",
      );
      return [];
    } finally {
      setIsOwnerVehicleReportsLoading(false);
    }
  };

  const getReportsAboutMe = async () => {
    try {
      setIsReportsAboutMeLoading(true);
      const response = await axios.get("/complaints/about-me");
      setReportsAboutMe(response.data.reports || []);
      setReportsAboutMeError("");
      return response.data.reports || [];
    } catch (error) {
      setReportsAboutMe([]);
      setReportsAboutMeError(
        error?.response?.data?.message || "Failed to load reports about you",
      );
      return [];
    } finally {
      setIsReportsAboutMeLoading(false);
    }
  };

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
        complaintTrendsGranularity,
        isComplaintTrendsLoading,
        complaintTrendsErrorMsg,
        getComplaintTrends,
        ownerVehicleReports,
        isOwnerVehicleReportsLoading,
        ownerVehicleReportsError,
        getOwnerVehicleReports,
        reportsAboutMe,
        isReportsAboutMeLoading,
        reportsAboutMeError,
        getReportsAboutMe,
      }}
    >
      {children}
    </ComplaintContext.Provider>
  );
};

export const useComplaintContext = () => useContext(ComplaintContext);
export default ComplaintContextProvider;
