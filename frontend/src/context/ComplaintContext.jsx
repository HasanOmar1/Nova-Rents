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

  const putUpdateComplaintStatus = async (
    complaintId,
    status,
    responseToUser,
  ) => {
    try {
      const response = await axios.put(`/complaints/${complaintId}/status`, {
        status,
        responseToUser,
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
      }}
    >
      {children}
    </ComplaintContext.Provider>
  );
};

export const useComplaintContext = () => useContext(ComplaintContext);
export default ComplaintContextProvider;
