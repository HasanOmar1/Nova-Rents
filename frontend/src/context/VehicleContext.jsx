import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useActivityContext } from "./ActivityContext";

const VehicleContext = createContext();

const VehicleContextProvider = ({ children }) => {
  const [errorMsg, setErrorMsg] = useState("");
  const [allVehicles, setAllVehicles] = useState([]);
  const [userVehicles, setUserVehicles] = useState([]);
  const [vehiclesBrands, setVehiclesBrands] = useState([]);
  const [vehicleModel, setVehicleModel] = useState([]);
  const [vehiclesType, setVehiclesType] = useState([]);
  const [vehicleStats, setVehicleStats] = useState({});
  const [pagination, setPagination] = useState({});
  const [currentStatus, setCurrentStatus] = useState("all");
  const [allVehPagination, setAllVehPagination] = useState({});
  const [availableFilters, setAvailableFilters] = useState({
    locations: [],
    brands: [],
    models: [],
    types: [],
  });
  const [allVehStats, setAllVehStats] = useState(null);
  const { loadActivities } = useActivityContext();

  const getAllVehicles = async (filters = {}, page = 1) => {
    try {
      const response = await axios.get("/vehicles", {
        params: { ...filters, page, limit: 6 },
      });
      setAllVehicles(response.data.vehicles);
      setAllVehPagination(response.data.pagination);
      setAvailableFilters(response.data.availableFilters);
      setAllVehStats(response.data.allVehStats);
      setErrorMsg("");
    } catch (error) {
      console.log(error?.response?.data?.message);
      setErrorMsg(error?.response?.data?.message);
    }
  };

  const getUserVehicles = async (page = 1, status = "all") => {
    try {
      setCurrentStatus(status);
      const response = await axios.get(
        `/vehicles/myVehicles?status=${status}&page=${page}`,
      );

      setUserVehicles(response.data.vehicles);
      setVehicleStats(response.data.stats);
      setPagination(response.data.pagination);
      setErrorMsg("");
    } catch (error) {
      console.log(error?.response?.data?.message);
      setErrorMsg(error?.response?.data?.message);
    }
  };

  const deleteUserVehicle = async (licensePlate) => {
    try {
      await axios.delete(`/vehicles/${licensePlate}`);
      getUserVehicles(pagination.currentPage || 1, currentStatus);
      setErrorMsg("");
      loadActivities();
      return true;
    } catch (error) {
      setErrorMsg(error?.response?.data?.message);
      return false;
    }
  };

  const getBrands = async () => {
    try {
      const response = await axios.get("/vehicles/brands");
      setVehiclesBrands(response.data.carBrands);
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
      setErrorMsg("");
    } catch (error) {
      console.log(error?.response.data?.message);
      setErrorMsg(error?.response.data?.message);
    }
  };

  const addVehicle = async (vehData) => {
    try {
      const response = await axios.post("/vehicles/add", vehData);
      await Promise.all([getAllVehicles(), getUserVehicles(1, currentStatus)]);
      setErrorMsg("");
      loadActivities();
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
      await Promise.all([
        getAllVehicles(),
        getUserVehicles(pagination.currentPage || 1, currentStatus),
      ]);

      loadActivities();

      setErrorMsg("");
      return true;
    } catch (error) {
      console.log(error?.response?.data?.message);
      setErrorMsg(error?.response?.data?.message);
      return false;
    }
  };
  const updateVehicleStatus = async (licensePlate, status) => {
    try {
      await axios.put(`/vehicles/update-vehicle-status/${licensePlate}`, {
        status,
      });

      await Promise.all([
        getAllVehicles(),
        getUserVehicles(pagination.currentPage || 1, currentStatus),
      ]);

      loadActivities();
      setErrorMsg("");
      return true;
    } catch (error) {
      console.log(error?.response?.data?.message);
      setErrorMsg(error?.response?.data?.message);
      return false;
    }
  };

  // Fetch a single vehicle by plate via the existing GET /vehicles/:licensePlate.
  // Returns the vehicle object, or null when not found / request failed.
  const getVehicleByLicensePlate = async (licensePlate) => {
    try {
      const response = await axios.get(`/vehicles/${licensePlate}`);
      setErrorMsg("");
      return response.data.vehicle || null;
    } catch (error) {
      setErrorMsg(error?.response?.data?.message);
      return null;
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
        vehicleStats,
        pagination,
        allVehPagination,
        availableFilters,
        allVehStats,
        updateVehicleStatus,
        getVehicleByLicensePlate,
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicleContext = () => useContext(VehicleContext);
export default VehicleContextProvider;
