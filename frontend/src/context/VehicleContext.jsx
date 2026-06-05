import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const VehicleContext = createContext();

const VehicleContextProvider = ({ children }) => {
  const [errorMsg, setErrorMsg] = useState("");
  const [allVehicles, setAllVehicles] = useState([]);
  const [userVehicles, setUserVehicles] = useState([]);

  const getAllVehicles = async () => {
    try {
      const response = await axios.get("/vehicles");
      setAllVehicles(response.data.vehicles);
      console.log("All vehicles:", response.data.vehicles);
      setErrorMsg("");
    } catch (error) {
      console.log(error?.response.data?.message);
      setErrorMsg(error?.response.data?.message);
    }
  };

  const getUserVehicles = async () => {
    try {
      const response = await axios.get("/vehicles/myVehicles");
      setUserVehicles(response.data.vehicles);
      console.log("User vehicles:", response.data.vehicles);
      setErrorMsg("");
    } catch (error) {
      console.log(error?.response.data?.message);
      setErrorMsg(error?.response.data?.message);
    }
  };

  const deleteUserVehicle = async (licensePlate) => {
    try {
      await axios.delete(`/vehicles/${licensePlate}`);
      getUserVehicles();
      return true;
    } catch (error) {
      console.log(error?.response.data?.message);
      setErrorMsg(error?.response.data?.message);
      return false;
    }
  };

  return (
    <VehicleContext.Provider
      value={{
        errorMsg,
        getAllVehicles,
        allVehicles,
        getUserVehicles,
        userVehicles,
        deleteUserVehicle,
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicleContext = () => useContext(VehicleContext);
export default VehicleContextProvider;
