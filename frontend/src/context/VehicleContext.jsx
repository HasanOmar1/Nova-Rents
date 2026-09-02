// Provides shared vehicle state and API operations through React context.
// It exports a provider component and a hook for consuming the managed data.
import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import axios from "axios";
import { useActivityContext } from "./ActivityContext";

const VehicleContext = createContext();

// Supplies vehicle collections and mutation actions to descendant components.
// Accepts children and returns a vehicle-context provider tree.
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

  // Loads vehicles into the relevant application state.
  // Accepts endpoint, filters, and page and returns a promise for the operation result.
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

  // Retrieves all vehicles for the current workflow.
  // Accepts filters and page and returns the computed result.
  const getAllVehicles = useCallback(
    (filters = {}, page = 1) => loadVehicles("/vehicles", filters, page),
    [loadVehicles],
  );

  // Retrieves admin vehicles for the current workflow.
  // Accepts filters and page and returns the computed result.
  const getAdminVehicles = useCallback(
    (filters = {}, page = 1) =>
      loadVehicles("/vehicles/admin", filters, page),
    [loadVehicles],
  );

  // Retrieves user vehicles for the current workflow.
  // Accepts page and status and returns a promise for the operation result.
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

  // Deletes user vehicle from persistent state.
  // Accepts license plate and returns a promise for the operation result.
  const deleteUserVehicle = async (licensePlate) => {
    try {
      await axios.delete(`/vehicles/${licensePlate}`);
      getUserVehicles(pagination.currentPage || 1, currentStatus);
      setErrorMsg("");
      loadActivities();
      setVehicleInventoryVersion(
        // Derives the next state value from the current state.
        // Accepts version and returns the updated state value.
        (version) => version + 1);
      return true;
    } catch (error) {
      setErrorMsg(error?.response?.data?.message);
      return false;
    }
  };

  // Retrieves brands for the current workflow.
  // Takes no arguments and returns a promise for the operation result.
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

  // Retrieves models by brand for the current workflow.
  // Accepts brand id and returns a promise for the operation result.
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

  // Retrieves veh type for the current workflow.
  // Takes no arguments and returns a promise for the operation result.
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

  // Creates a vehicle through the API and refreshes the managed vehicle list.
  // Accepts vehicle form data and returns a promise for the created record.
  const addVehicle = async (vehData) => {
    try {
      await axios.post("/vehicles/add", vehData);
      await Promise.all([getAllVehicles(), getUserVehicles(1, currentStatus)]);
      setErrorMsg("");
      loadActivities();
      setVehicleInventoryVersion(
        // Derives the next state value from the current state.
        // Accepts version and returns the updated state value.
        (version) => version + 1);
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

  // Updates vehicle with the supplied changes.
  // Accepts license plate and veh data and returns a promise for the operation result.
  const updateVehicle = async (licensePlate, vehData) => {
    try {
      await axios.put(`/vehicles/${licensePlate}`, vehData);
      await Promise.all([
        getAllVehicles(),
        getUserVehicles(pagination.currentPage || 1, currentStatus),
      ]);

      loadActivities();
      setVehicleInventoryVersion(
        // Derives the next state value from the current state.
        // Accepts version and returns the updated state value.
        (version) => version + 1);

      setErrorMsg("");
      return true;
    } catch (error) {
      console.log(error?.response?.data?.message);
      setErrorMsg(error?.response?.data?.message);
      return false;
    }
  };
  // Updates vehicle status with the supplied changes.
  // Accepts license plate and status and returns a promise for the operation result.
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
      setVehicleInventoryVersion(
        // Derives the next state value from the current state.
        // Accepts version and returns the updated state value.
        (version) => version + 1);
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

  // Retrieves vehicle by license plate for the current workflow.
  // Accepts license plate and an options object and returns a promise for the operation result.
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

// Reads the vehicle state and actions exposed by the nearest provider.
// Takes no arguments and returns the current vehicle context value.
export const useVehicleContext = () => useContext(VehicleContext);
export default VehicleContextProvider;
