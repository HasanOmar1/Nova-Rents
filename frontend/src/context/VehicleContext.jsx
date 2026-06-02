import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const VehicleContext = createContext();

const VehicleContextProvider = ({ children }) => {
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const [allVehicles, setAllVehicles] = useState([]);

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

  return (
    <VehicleContext.Provider value={{ errorMsg, getAllVehicles, allVehicles }}>
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicleContext = () => useContext(VehicleContext);
export default VehicleContextProvider;
