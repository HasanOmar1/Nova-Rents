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

  // Test payment (no real money). Preserves HTTP status for UI mapping.
  const getPaymentByToken = async (paymentToken) => {
    try {
      const res = await axios.get(`/payments/${paymentToken}`);
      return {
        ok: true,
        status: res.status,
        payment: res.data.payment || null,
        message: res.data.message || null,
      };
    } catch (error) {
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || null;
      console.log("Failed to fetch payment", message);
      return {
        ok: false,
        status,
        payment: null,
        message,
      };
    }
  };

  const payByToken = async (paymentToken) => {
    try {
      const res = await axios.post(`/payments/${paymentToken}/pay`);
      loadActivities();
      return { success: true, payment: res.data.payment };
    } catch (error) {
      return {
        success: false,
        message:
          error?.response?.data?.message || "Test payment failed. Try again.",
      };
    }
  };

  // UX-only helpers from cached My Trips. Backend still authorizes on create.
  const findPaidTripForVehicle = (licensePlate) => {
    if (licensePlate == null || licensePlate === "") return null;
    const trips = rentalHistory.myTrips || [];
    return (
      trips.find(
        (trip) =>
          trip.paymentStatus === "paid" &&
          String(trip.licensePlate) === String(licensePlate),
      ) || null
    );
  };

  const findPaidTripForOwner = (ownerId) => {
    const parsedOwnerId = Number(ownerId);
    if (!Number.isInteger(parsedOwnerId) || parsedOwnerId <= 0) return null;
    const trips = rentalHistory.myTrips || [];
    return (
      trips.find(
        (trip) =>
          trip.paymentStatus === "paid" &&
          Number(trip.ownerId) === parsedOwnerId,
      ) || null
    );
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
        getPaymentByToken,
        payByToken,
        findPaidTripForVehicle,
        findPaidTripForOwner,
      }}
    >
      {children}
    </RentContext.Provider>
  );
};

export const useRentContext = () => useContext(RentContext);
export default RentContextProvider;
