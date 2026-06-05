import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const VehicleContext = createContext();

const VehicleContextProvider = ({ children }) => {
  const [errorMsg, setErrorMsg] = useState("");
  const [allVehicles, setAllVehicles] = useState([]);
  const [userVehicles, setUserVehicles] = useState([]);
  const [vehiclesBrands, setVehiclesBrands] = useState([]);
  const [vehicleModel, setVehicleModel] = useState([]);
  const [vehiclesType, setVehiclesType] = useState([]);

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

  const getBrands = async () => {
    try {
      const response = await axios.get("/vehicles/brands");
      setVehiclesBrands(response.data.carBrands);
      console.log("Brands: ", response.data.carBrands);
      setErrorMsg("");
    } catch (error) {
      console.log(error?.response.data?.message);
      setErrorMsg(error?.response.data?.message);
    }
  };

  const getModelsByBrand = async (brandId) => {
    try {
      const response = await axios.get(`/vehicles/models?brandId=${brandId}`);
      setVehicleModel(response.data.carModels);
      console.log("Models: ", response.data.carModels);
      setErrorMsg("");
    } catch (error) {
      console.log(error?.response.data?.message);
      setErrorMsg(error?.response.data?.message);
    }
  };

  const getVehType = async () => {
    try {
      const response = await axios.get(`/vehicles/types`);
      setVehiclesType(response.data.carTypes);
      console.log("Types: ", response.data.carTypes);
      setErrorMsg("");
    } catch (error) {
      console.log(error?.response.data?.message);
      setErrorMsg(error?.response.data?.message);
    }
  };

  const addVehicle = async (vehData) => {
    try {
      const response = await axios.post("/vehicles/add", vehData);
      console.log("Adding Vehicle:", response.data);
      await Promise.all([getAllVehicles(), getUserVehicles()]);
      setErrorMsg("");
      return true;
    } catch (error) {
      console.log(error?.response.data?.message);
      setErrorMsg(error?.response.data?.message);
      return false;
    }
  };

  const updateVehicle = async (licensePlate, vehData) => {
    try {
      const response = await axios.put(`/vehicles/${licensePlate}`, vehData);
      console.log("Updating Vehicle:", response.data);
      await Promise.all([getAllVehicles(), getUserVehicles()]);
      setErrorMsg("");
      return true;
    } catch (error) {
      console.log(error?.response?.data?.message);
      setErrorMsg(error?.response?.data?.message);
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
        getBrands,
        vehiclesBrands,
        getModelsByBrand,
        vehicleModel,
        getVehType,
        vehiclesType,
        addVehicle,
        setErrorMsg,
        updateVehicle,
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicleContext = () => useContext(VehicleContext);
export default VehicleContextProvider;
