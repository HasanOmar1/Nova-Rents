import axios from "axios";
import { createContext, useContext, useState } from "react";
import { useActivityContext } from "./ActivityContext";

const RentContext = createContext();

const RentContextProvider = ({ children }) => {
  const [rentVehResponse, setRentVehResponse] = useState("");
  const [bookedRanges, setBookedRanges] = useState([]);
  const [dateError, setDateError] = useState("");
  const { loadActivities } = useActivityContext();

  const rentVehicle = async (data) => {
    try {
      const res = await axios.post(`/rentals/rent`, data);
      setRentVehResponse(res.data.message);
      loadActivities();
      return true;
    } catch (error) {
      console.log(error?.response.data?.message);
      setRentVehResponse(error?.response?.data?.message || "Booking failed.");
      return false;
    }
  };

  const fetchBookedDates = async (licensePlate) => {
    try {
      const res = await axios.get(`/rentals/booked-dates/${licensePlate}`);
      setBookedRanges(res.data.bookedDates);
    } catch (error) {
      console.log(error?.response.data?.message);
      setDateError(error?.response.data?.message);
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
      }}
    >
      {children}
    </RentContext.Provider>
  );
};

export const useRentContext = () => useContext(RentContext);

export default RentContextProvider;
