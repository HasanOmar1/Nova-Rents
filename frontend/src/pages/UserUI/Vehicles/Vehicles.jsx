import { useEffect, useState, useMemo } from "react";
import styles from "./Vehicles.module.css";
import VehiclesCards from "../../../components/VehiclesCards/VehiclesCards";
import { Link } from "react-router-dom";
import { useVehicleContext } from "../../../context/VehicleContext";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import Pagination from "../../../components/Pagination/Pagination";

const Vehicles = () => {
  const [filterBrand, setFilterBrand] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { getAllVehicles, allVehicles, allVehPagination, availableFilters } =
    useVehicleContext();

  const displayedBrands = useMemo(() => {
    if (!availableFilters.combinations) return availableFilters.brands || [];
    return [
      ...new Set(
        availableFilters.combinations
          .filter((c) => {
            const matchModel = filterModel ? c.modelName === filterModel : true;
            const matchType = filterType ? c.carTypeName === filterType : true;
            const matchLocation = filterLocation
              ? c.address === filterLocation
              : true;
            return matchModel && matchType && matchLocation;
          })
          .map((c) => c.brandName),
      ),
    ];
  }, [
    filterModel,
    filterType,
    filterLocation,
    availableFilters.combinations,
    availableFilters.brands,
  ]);

  const displayedModels = useMemo(() => {
    if (!availableFilters.combinations)
      return availableFilters.models?.map((m) => m.model) || [];
    return [
      ...new Set(
        availableFilters.combinations
          .filter((c) => {
            const matchBrand = filterBrand ? c.brandName === filterBrand : true;
            const matchType = filterType ? c.carTypeName === filterType : true;
            const matchLocation = filterLocation
              ? c.address === filterLocation
              : true;
            return matchBrand && matchType && matchLocation;
          })
          .map((c) => c.modelName),
      ),
    ];
  }, [
    filterBrand,
    filterType,
    filterLocation,
    availableFilters.combinations,
    availableFilters.models,
  ]);

  const displayedTypes = useMemo(() => {
    if (!availableFilters.combinations) return availableFilters.types || [];
    return [
      ...new Set(
        availableFilters.combinations
          .filter((c) => {
            const matchBrand = filterBrand ? c.brandName === filterBrand : true;
            const matchModel = filterModel ? c.modelName === filterModel : true;
            const matchLocation = filterLocation
              ? c.address === filterLocation
              : true;
            return matchBrand && matchModel && matchLocation;
          })
          .map((c) => c.carTypeName),
      ),
    ];
  }, [
    filterBrand,
    filterModel,
    filterLocation,
    availableFilters.combinations,
    availableFilters.types,
  ]);

  const displayedLocations = useMemo(() => {
    if (!availableFilters.combinations) return availableFilters.locations || [];
    return [
      ...new Set(
        availableFilters.combinations
          .filter((c) => {
            const matchBrand = filterBrand ? c.brandName === filterBrand : true;
            const matchModel = filterModel ? c.modelName === filterModel : true;
            const matchType = filterType ? c.carTypeName === filterType : true;
            return matchBrand && matchModel && matchType;
          })
          .map((c) => c.address),
      ),
    ];
  }, [
    filterBrand,
    filterModel,
    filterType,
    availableFilters.combinations,
    availableFilters.locations,
  ]);

  useEffect(() => {
    if (!availableFilters || !availableFilters.combinations) return;

    if (filterBrand && !displayedBrands.includes(filterBrand))
      setFilterBrand("");
    if (filterModel && !displayedModels.includes(filterModel))
      setFilterModel("");
    if (filterType && !displayedTypes.includes(filterType)) setFilterType("");
    if (filterLocation && !displayedLocations.includes(filterLocation))
      setFilterLocation("");
  }, [
    filterBrand,
    filterModel,
    filterType,
    filterLocation,
    displayedBrands,
    displayedModels,
    displayedTypes,
    displayedLocations,
    availableFilters,
  ]);

  useEffect(() => {
    const filters = {
      brand: filterBrand,
      model: filterModel,
      type: filterType,
      location: filterLocation,
      sort: sortOption,
    };

    getAllVehicles(filters, currentPage);
  }, [
    filterBrand,
    filterModel,
    filterType,
    filterLocation,
    sortOption,
    currentPage,
  ]);

  const handleNextPage = () => {
    if (allVehPagination?.currentPage < allVehPagination?.totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (allVehPagination?.currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleResetFilters = () => {
    setFilterBrand("");
    setFilterModel("");
    setFilterType("");
    setFilterLocation("");
    setSortOption("");
    setCurrentPage(1);
  };

  const isFilterActive =
    filterBrand || filterModel || filterType || filterLocation || sortOption;

  return (
    <div className={`${styles.Vehicles} page`}>
      <h1>Vehicles</h1>

      <div className={styles.btnsContainer}>
        <Link to={"/map"} className={styles.openMapBtn}>
          Open Map View
        </Link>
      </div>

      <div className={styles.filterContainer}>
        <div className={styles.inputsContainer}>
          <div
            className={`${styles.top} ${isFilterActive ? styles.hasActiveFilters : ""}`}
          >
            {/* 1. BRAND */}
            <select
              value={filterBrand}
              onChange={(e) => {
                setFilterBrand(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Brands</option>
              {displayedBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
            {/* 2. MODEL */}
            <select
              value={filterModel}
              onChange={(e) => {
                setFilterModel(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Models</option>
              {displayedModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            {/* 3. TYPE */}
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Categories</option>
              {displayedTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {/* 4. LOCATION */}
            <select
              value={filterLocation}
              onChange={(e) => {
                setFilterLocation(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Locations</option>
              {displayedLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            {/* 5. SORTING */}
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Sort: Newest Added</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="year_desc">Year: Newest</option>
              <option value="year_asc">Year: Oldest</option>
            </select>
            <div className={styles.filterActions}>
              <button
                className={styles.resetBtn}
                onClick={handleResetFilters}
                tabIndex={isFilterActive ? 0 : -1}
              >
                <RotateCcw size={16} /> Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.vehiclesCardsContainer}>
        {allVehicles?.length > 0 ? (
          allVehicles.map((veh) => (
            <VehiclesCards key={veh.licensePlate} veh={veh} />
          ))
        ) : (
          <p className={styles.noVeh}>
            No vehicles found matching these filters.
          </p>
        )}
      </div>

      {allVehicles?.length > 0 && (
        <Pagination
          currentPage={allVehPagination?.currentPage}
          totalPages={allVehPagination?.totalPages}
          handlePrevPage={handlePrevPage}
          handleNextPage={handleNextPage}
          leftText={`Showing ${allVehicles?.length || 0} of ${allVehPagination?.totalVehicles || 0} vehicles`}
        />
      )}
    </div>
  );
};

export default Vehicles;
