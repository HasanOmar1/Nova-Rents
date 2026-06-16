import axios from "axios";
import { createContext, useContext, useState } from "react";
import { useActivityContext } from "./ActivityContext";

const RentContext = createContext();

const RentContextProvider = ({ children }) => {
  const [rentVehResponse, setRentVehResponse] = useState("");
  const [bookedRanges, setBookedRanges] = useState([]);
  const [dateError, setDateError] = useState("");
  const { loadActivities } = useActivityContext();
  const [metrics, setMetrics] = useState({
    monthlyEarnings: 0,
    pendingRequests: 0,
    upcomingTrips: 0,
    tripsTaken: 0,
    chartData: [],
  });

  const [rentalHistory, setRentalHistory] = useState({
    pendingRequests: [],
    myTrips: [],
  });
  const [historyLoading, setHistoryLoading] = useState(true);

  const rentVehicle = async (data) => {
    try {
      const res = await axios.post(`/rentals/rent`, data);
      setRentVehResponse(res.data.message);
      loadActivities();
      return true;
    } catch (error) {
      console.log(error?.response?.data?.message);
      setRentVehResponse(error?.response?.data?.message || "Booking failed.");
      return false;
    }
  };

  const fetchBookedDates = async (licensePlate) => {
    try {
      const res = await axios.get(`/rentals/booked-dates/${licensePlate}`);
      setBookedRanges(res.data.bookedDates);
    } catch (error) {
      console.log(error?.response?.data?.message);
      setDateError(error?.response?.data?.message);
    }
  };

  const fetchDashboardMetrics = async () => {
    try {
      const res = await axios.get("/rentals/dashboard-metrics");
      setMetrics(res.data);
    } catch (error) {
      console.log("Failed to fetch dashboard metrics", error);
    }
  };

  const fetchRentalHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await axios.get("/rentals/history");
      setRentalHistory(res.data);
    } catch (error) {
      console.log("Failed to fetch rental history", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const respondToRequest = async (rentalId, action) => {
    try {
      await axios.put(`/rentals/${action}-rental/${rentalId}`);
      await fetchRentalHistory();
      loadActivities();
      return true;
    } catch (error) {
      console.log(`Failed to ${action} rental`, error);
      return false;
    }
  };

  return (
    <RentContext.Provider
      value={{
        rentVehicle,
        rentVehResponse,
        setRentVehResponse,
        fetchBookedDates,
        bookedRanges,
        dateError,
        setDateError,
        fetchDashboardMetrics,
        metrics,
        fetchRentalHistory,
        rentalHistory,
        historyLoading,
        respondToRequest,
      }}
    >
      {children}
    </RentContext.Provider>
  );
};

export const useRentContext = () => useContext(RentContext);
export default RentContextProvider;
