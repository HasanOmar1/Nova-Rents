import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
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
  const [vehicleInventoryVersion, setVehicleInventoryVersion] = useState(0);
  const [allVehPagination, setAllVehPagination] = useState({});
  const [availableFilters, setAvailableFilters] = useState({
    locations: [],
    brands: [],
    models: [],
    types: [],
  });
  const [allVehStats, setAllVehStats] = useState(null);
  const { loadActivities } = useActivityContext();

  const loadVehicles = useCallback(async (endpoint, filters = {}, page = 1) => {
    try {
      const response = await axios.get(endpoint, {
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
  }, []);

  const getAllVehicles = useCallback(
    (filters = {}, page = 1) => loadVehicles("/vehicles", filters, page),
    [loadVehicles],
  );

  const getAdminVehicles = useCallback(
    (filters = {}, page = 1) =>
      loadVehicles("/vehicles/admin", filters, page),
    [loadVehicles],
  );

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
      setVehicleInventoryVersion((version) => version + 1);
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
      const message =
        error?.response?.data?.message ||
        "Unable to load vehicle brands. Please try again.";
      console.log(message);
      setErrorMsg(message);
    }
  };

  const getModelsByBrand = async (brandId) => {
    try {
      const response = await axios.get(`/vehicles/models?brandId=${brandId}`);
      setVehicleModel(response.data.carModels);
      setErrorMsg("");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Unable to load vehicle models. Please try again.";
      console.log(message);
      setErrorMsg(message);
    }
  };

  const getVehType = async () => {
    try {
      const response = await axios.get(`/vehicles/types`);
      setVehiclesType(response.data.carTypes);
      setErrorMsg("");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Unable to load vehicle types. Please try again.";
      console.log(message);
      setErrorMsg(message);
    }
  };

  const addVehicle = async (vehData) => {
    try {
      await axios.post("/vehicles/add", vehData);
      await Promise.all([getAllVehicles(), getUserVehicles(1, currentStatus)]);
      setErrorMsg("");
      loadActivities();
      setVehicleInventoryVersion((version) => version + 1);
      return true;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Unable to add the vehicle. Please check your connection and try again.";
      console.log(message);
      setErrorMsg(message);
      return false;
    }
  };

  const updateVehicle = async (licensePlate, vehData) => {
    try {
      await axios.put(`/vehicles/${licensePlate}`, vehData);
      await Promise.all([
        getAllVehicles(),
        getUserVehicles(pagination.currentPage || 1, currentStatus),
      ]);

      loadActivities();
      setVehicleInventoryVersion((version) => version + 1);

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
      setVehicleInventoryVersion((version) => version + 1);
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
  const getVehicleByLicensePlate = useCallback(
    async (licensePlate, { silent = false } = {}) => {
      try {
        const response = await axios.get(`/vehicles/${licensePlate}`);
        if (!silent) setErrorMsg("");
        return response.data.vehicle || null;
      } catch (error) {
        if (silent) throw error;
        setErrorMsg(error?.response?.data?.message);
        return null;
      }
    },
    [],
  );

  return (
    <VehicleContext.Provider
      value={{
        errorMsg,
        getAllVehicles,
        getAdminVehicles,
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
        vehicleInventoryVersion,
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicleContext = () => useContext(VehicleContext);
export default VehicleContextProvider;
