// Provides shared rent state and API operations through React context.
// It exports a provider component and a hook for consuming the managed data.
import axios from "axios";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useActivityContext } from "./ActivityContext";

const RentContext = createContext();

// Supplies rental, eligibility, payment, and trip state to descendants.
// Accepts children and returns a rental-context provider tree.
const RentContextProvider = ({ children }) => {
  const [rentVehResponse, setRentVehResponse] = useState("");
  const [bookedRanges, setBookedRanges] = useState([]);
  const [dateError, setDateError] = useState("");
  const { loadActivities } = useActivityContext();
  const [metrics, setMetrics] = useState({
    monthlyEarnings: 0,
    pendingRequests: 0,
    paymentRequired: 0,
    waitingForOwnerApproval: 0,
  });

  const [rentalHistory, setRentalHistory] = useState({
    pendingRequests: [],
    myTrips: [],
  });
  const [historyLoading, setHistoryLoading] = useState(true);
  const [rentalEligibility, setRentalEligibility] = useState(null);
  const eligibilityRequestRef = useRef(null);

  // Fetches rental eligibility from its configured data source.
  // Accepts an options object and returns a promise for the operation result.
  const fetchRentalEligibility = useCallback(async ({ force = false } = {}) => {
    if (!force && eligibilityRequestRef.current) {
      return eligibilityRequestRef.current;
    }

    const request = (
      // Runs the callback required by the surrounding operation.
      // Takes no arguments and returns a promise for the callback result.
      async () => {
        try {
          const res = await axios.get("/rentals/eligibility");
          setRentalEligibility(res.data);
          return res.data;
        } catch (error) {
          const message =
            error?.response?.data?.message ||
            error?.message ||
            "Failed to fetch rental eligibility";
          console.error("fetchRentalEligibility failed:", message);
          setRentalEligibility(null);
          return null;
        } finally {
          eligibilityRequestRef.current = null;
        }
      })();

    eligibilityRequestRef.current = request;
    return request;
  }, []);

  // Submits a vehicle rental request and stores its response state.
  // Accepts rental data and returns a promise for the API result.
  const rentVehicle = async (data) => {
    try {
      const res = await axios.post(`/rentals/rent`, data);
      setRentVehResponse(res.data.message);
      loadActivities();
      return { success: true, message: res.data.message };
    } catch (error) {
      const payload = error?.response?.data || {};
      const message = payload.message || "Booking failed.";
      setRentVehResponse(message);
      return {
        success: false,
        message,
        reasons: payload.reasons || [],
        statuses: payload.statuses || {},
      };
    }
  };

  // Fetches booked dates from its configured data source.
  // Accepts license plate and returns a promise for the operation result.
  const fetchBookedDates = async (licensePlate) => {
    try {
      const res = await axios.get(`/rentals/booked-dates/${licensePlate}`);
      setBookedRanges(res.data.bookedDates);
    } catch (error) {
      console.log(error?.response?.data?.message);
      setDateError(error?.response?.data?.message);
    }
  };

  // Fetches dashboard metrics from its configured data source.
  // Takes no arguments and returns a promise for the operation result.
  const fetchDashboardMetrics = useCallback(async () => {
    try {
      const res = await axios.get("/rentals/dashboard-metrics");
      setMetrics(res.data);
    } catch (error) {
      console.log("Failed to fetch dashboard metrics", error);
    }
  }, []);

  // Fetches rental history from its configured data source.
  // Takes no arguments and returns a promise for the operation result.
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

  // Accepts or rejects a pending rental request and refreshes dashboard metrics.
  // Accepts a rental ID and action and returns a promise for the API result.
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

  // Retrieves payment by token for the current workflow.
  // Accepts payment token and returns a promise for the operation result.
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

  // Processes pay by token for the active rental.
  // Accepts payment token and returns a promise for the operation result.
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

  // Finds paid trip for vehicle in the available data.
  // Accepts license plate and returns the computed result.
  const findPaidTripForVehicle = (licensePlate) => {
    if (licensePlate == null || licensePlate === "") return null;
    const trips = rentalHistory.myTrips || [];
    return (
      trips.find(
        // Tests whether one collection entry is the requested match.
        // Accepts trip and returns a Boolean match result.
        (trip) =>
          trip.paymentStatus === "paid" &&
          String(trip.licensePlate) === String(licensePlate),
      ) || null
    );
  };

  // Finds paid trip for owner in the available data.
  // Accepts owner id and returns the computed result.
  const findPaidTripForOwner = (ownerId) => {
    const parsedOwnerId = Number(ownerId);
    if (!Number.isInteger(parsedOwnerId) || parsedOwnerId <= 0) return null;
    const trips = rentalHistory.myTrips || [];
    return (
      trips.find(
        // Tests whether one collection entry is the requested match.
        // Accepts trip and returns a Boolean match result.
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
        rentalEligibility,
        fetchRentalEligibility,
      }}
    >
      {children}
    </RentContext.Provider>
  );
};

// Reads rental state and actions exposed by the nearest provider.
// Takes no arguments and returns the current rent context value.
export const useRentContext = () => useContext(RentContext);
export default RentContextProvider;
