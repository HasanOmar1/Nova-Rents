import { useEffect, useState } from "react";
import styles from "./Vehicles.module.css";
import VehiclesCards from "../../../components/VehiclesCards/VehiclesCards";
import { Link } from "react-router-dom";
import { useVehicleContext } from "../../../context/VehicleContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Vehicles = () => {
  // Filter States
  const [filterBrand, setFilterBrand] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { getAllVehicles, allVehicles, allVehPagination, availableFilters } =
    useVehicleContext();

  // Fetch data whenever a filter, sort, or page changes
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

  // ==========================================
  // SMART DROPDOWN CALCULATIONS
  // ==========================================

  // 1. Models: Only show models for the selected Brand
  const displayedModels = filterBrand
    ? availableFilters.models?.filter((m) => m.brand === filterBrand) || []
    : availableFilters.models || [];

  // 2. Types: Only show types that exist for the selected Brand & Model
  const displayedTypes = availableFilters.combinations
    ? [
        ...new Set(
          availableFilters.combinations
            .filter((c) => {
              const matchBrand = filterBrand
                ? c.brandName === filterBrand
                : true;
              const matchModel = filterModel
                ? c.modelName === filterModel
                : true;
              return matchBrand && matchModel;
            })
            .map((c) => c.carTypeName),
        ),
      ]
    : availableFilters.types || [];

  // 3. Locations: Only show locations that have the selected Brand, Model, and Type!
  const displayedLocations = availableFilters.combinations
    ? [
        ...new Set(
          availableFilters.combinations
            .filter((c) => {
              const matchBrand = filterBrand
                ? c.brandName === filterBrand
                : true;
              const matchModel = filterModel
                ? c.modelName === filterModel
                : true;
              const matchType = filterType
                ? c.carTypeName === filterType
                : true;
              return matchBrand && matchModel && matchType;
            })
            .map((c) => c.address),
        ),
      ]
    : availableFilters.locations || [];

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
          <div className={styles.top}>
            {/* 1. BRAND */}
            <select
              value={filterBrand}
              onChange={(e) => {
                setFilterBrand(e.target.value);
                setFilterModel(""); // Clear dependent filters to prevent dead-ends
                setCurrentPage(1);
              }}
            >
              <option value="">All Brands</option>
              {availableFilters.brands?.map((brand) => (
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
              {displayedModels.map((m) => (
                <option key={m.model} value={m.model}>
                  {m.model}
                </option>
              ))}
            </select>

            {/* 3. TYPE (Now Smart!) */}
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

            {/* 4. LOCATION (Now Smart!) */}
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
          </div>
        </div>
      </div>

      <div className={styles.vehiclesCardsContainer}>
        {allVehicles?.length > 0 ? (
          allVehicles.map((veh) => (
            <VehiclesCards key={veh.licensePlate} veh={veh} />
          ))
        ) : (
          <p style={{ color: "gray", marginTop: "20px" }}>
            No vehicles found matching these filters.
          </p>
        )}
      </div>

      {/* PAGINATION CONTROLS */}
      {allVehicles?.length > 0 && (
        <div className={styles.pagination}>
          <p>
            Showing {allVehicles.length} of {allVehPagination?.totalVehicles}{" "}
            vehicles
          </p>
          <div className={styles.pagBtnsContainer}>
            <button
              onClick={handlePrevPage}
              disabled={
                allVehPagination?.currentPage === 1 ||
                !allVehPagination?.currentPage
              }
            >
              <ChevronLeft size={20} /> Prev
            </button>
            <p>
              Page {allVehPagination?.currentPage || 1} /{" "}
              {allVehPagination?.totalPages || 1}
            </p>
            <button
              onClick={handleNextPage}
              disabled={
                allVehPagination?.currentPage ===
                  allVehPagination?.totalPages || !allVehPagination?.totalPages
              }
            >
              Next <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vehicles;
