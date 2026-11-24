// Presents the searchable, filterable catalog of rentable vehicles.
// It takes no props and returns catalog controls, cards, and pagination.
import { useEffect, useState } from "react";
import styles from "./Vehicles.module.css";
import VehiclesCards from "../../../components/VehiclesCards/VehiclesCards";
import { Link } from "react-router-dom";
import { useVehicleContext } from "../../../context/VehicleContext";
import { RotateCcw } from "lucide-react";
import Pagination from "../../../components/Pagination/Pagination";
import { usePagination } from "../../../hooks/usePagination";

/* Renders the vehicles view and coordinates its page state.
 * It accepts no arguments and returns the rendered page JSX. */
const Vehicles = () => {
  const [filterBrand, setFilterBrand] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterSeats, setFilterSeats] = useState("");
  const [sortOption, setSortOption] = useState("");

  const { getAllVehicles, allVehicles, allVehPagination, availableFilters } =
    useVehicleContext();
  const { currentPage, nextPage, previousPage, resetPage } = usePagination({
    totalPages: allVehPagination?.totalPages,
  });

  const combinations = availableFilters?.combinations || [];

  const displayedBrands =
    combinations.length > 0
      ? [
          ...new Set(
            combinations
              .filter(
                /* Tests whether each collection entry belongs in the filtered result.
                 * It accepts c and returns a boolean. */
                (c) => {
                  const matchModel = filterModel
                    ? c.modelName === filterModel
                    : true;
                  const matchType = filterType
                    ? c.carTypeName === filterType
                    : true;
                  const matchLocation = filterLocation
                    ? c.address === filterLocation
                    : true;
                  const matchSeats = filterSeats
                    ? String(c.seats) === String(filterSeats)
                    : true;
                  return matchModel && matchType && matchLocation && matchSeats;
                })
              .map(
                /* Transforms each collection entry for the surrounding mapping.
                 * It accepts c and returns the mapped value. */
                (c) => c.brandName),
          ),
        ]
      : availableFilters?.brands || [];

  const displayedModels =
    combinations.length > 0
      ? [
          ...new Set(
            combinations
              .filter(
                /* Tests whether each collection entry belongs in the filtered result.
                 * It accepts c and returns a boolean. */
                (c) => {
                  const matchBrand = filterBrand
                    ? c.brandName === filterBrand
                    : true;
                  const matchType = filterType
                    ? c.carTypeName === filterType
                    : true;
                  const matchLocation = filterLocation
                    ? c.address === filterLocation
                    : true;
                  const matchSeats = filterSeats
                    ? String(c.seats) === String(filterSeats)
                    : true;
                  return matchBrand && matchType && matchLocation && matchSeats;
                })
              .map(
                /* Transforms each collection entry for the surrounding mapping.
                 * It accepts c and returns the mapped value. */
                (c) => c.modelName),
          ),
        ]
      : availableFilters?.models?.map(
        /* Extracts each model name for the model filter options.
         * It accepts a model record and returns its model name. */
        (m) => m.model) || [];

  const displayedTypes =
    combinations.length > 0
      ? [
          ...new Set(
            combinations
              .filter(
                /* Tests whether each collection entry belongs in the filtered result.
                 * It accepts c and returns a boolean. */
                (c) => {
                  const matchBrand = filterBrand
                    ? c.brandName === filterBrand
                    : true;
                  const matchModel = filterModel
                    ? c.modelName === filterModel
                    : true;
                  const matchLocation = filterLocation
                    ? c.address === filterLocation
                    : true;
                  const matchSeats = filterSeats
                    ? String(c.seats) === String(filterSeats)
                    : true;
                  return matchBrand && matchModel && matchLocation && matchSeats;
                })
              .map(
                /* Transforms each collection entry for the surrounding mapping.
                 * It accepts c and returns the mapped value. */
                (c) => c.carTypeName),
          ),
        ]
      : availableFilters?.types || [];

  const displayedLocations =
    combinations.length > 0
      ? [
          ...new Set(
            combinations
              .filter(
                /* Tests whether each collection entry belongs in the filtered result.
                 * It accepts c and returns a boolean. */
                (c) => {
                  const matchBrand = filterBrand
                    ? c.brandName === filterBrand
                    : true;
                  const matchModel = filterModel
                    ? c.modelName === filterModel
                    : true;
                  const matchType = filterType
                    ? c.carTypeName === filterType
                    : true;
                  const matchSeats = filterSeats
                    ? String(c.seats) === String(filterSeats)
                    : true;
                  return matchBrand && matchModel && matchType && matchSeats;
                })
              .map(
                /* Transforms each collection entry for the surrounding mapping.
                 * It accepts c and returns the mapped value. */
                (c) => c.address),
          ),
        ]
      : availableFilters?.locations || [];

  const displayedSeats =
    combinations.length > 0
      ? [
          ...new Set(
            combinations
              .filter(
                /* Tests whether each collection entry belongs in the filtered result.
                 * It accepts c and returns a boolean. */
                (c) => {
                  const matchBrand = filterBrand
                    ? c.brandName === filterBrand
                    : true;
                  const matchModel = filterModel
                    ? c.modelName === filterModel
                    : true;
                  const matchType = filterType
                    ? c.carTypeName === filterType
                    : true;
                  const matchLocation = filterLocation
                    ? c.address === filterLocation
                    : true;
                  return matchBrand && matchModel && matchType && matchLocation;
                })
              .map(
                /* Transforms each collection entry for the surrounding mapping.
                 * It accepts c and returns the mapped value. */
                (c) => c.seats),
          ),
        ].sort(
          /* Orders two collection entries for the surrounding sort.
           * It accepts a and b and returns their numeric ordering. */
          (a, b) => a - b) // Sort seats numerically
      : [2, 4, 5, 7, 8, 9]; // Fallback defaults

  // --- Auto-clear invalid filters ---
  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      if (!availableFilters || !availableFilters.combinations) return;

      if (filterBrand && !displayedBrands.includes(filterBrand))
        setFilterBrand("");
      if (filterModel && !displayedModels.includes(filterModel))
        setFilterModel("");
      if (filterType && !displayedTypes.includes(filterType)) setFilterType("");
      if (filterLocation && !displayedLocations.includes(filterLocation))
        setFilterLocation("");
      if (filterSeats && !displayedSeats.includes(Number(filterSeats)))
        setFilterSeats("");
    }, [
    filterBrand,
    filterModel,
    filterType,
    filterLocation,
    filterSeats,
    displayedBrands,
    displayedModels,
    displayedTypes,
    displayedLocations,
    displayedSeats,
    availableFilters,
  ]);

  // --- Fetch Data ---
  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      const filters = {
        brand: filterBrand,
        model: filterModel,
        type: filterType,
        location: filterLocation,
        seats: filterSeats, // <-- NEW
        sort: sortOption,
      };

      getAllVehicles(filters, currentPage);
    }, [
    filterBrand,
    filterModel,
    filterType,
    filterLocation,
    filterSeats,
    sortOption,
    currentPage,
  ]);

  /* Restores every catalog filter and sort control to its default value.
   * It accepts no arguments and returns undefined. */
  const handleResetFilters = () => {
    setFilterBrand("");
    setFilterModel("");
    setFilterType("");
    setFilterLocation("");
    setFilterSeats(""); // <-- NEW
    setSortOption("");
    resetPage();
  };

  const isFilterActive =
    filterBrand ||
    filterModel ||
    filterType ||
    filterLocation ||
    filterSeats ||
    sortOption;

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
              onChange={
                /* Handles the change callback for this rendered control.
                 * It accepts e and returns the delegated result. */
                (e) => {
                  setFilterBrand(e.target.value);
                  resetPage();
                }}
            >
              <option value="">All Brands</option>
              {displayedBrands.map(
                /* Transforms each collection entry for the surrounding mapping.
                 * It accepts brand and returns the mapped value. */
                (brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
              ))}
            </select>

            {/* 2. MODEL */}
            <select
              value={filterModel}
              onChange={
                /* Handles the change callback for this rendered control.
                 * It accepts e and returns the delegated result. */
                (e) => {
                  setFilterModel(e.target.value);
                  resetPage();
                }}
            >
              <option value="">All Models</option>
              {displayedModels.map(
                /* Transforms each collection entry for the surrounding mapping.
                 * It accepts model and returns the mapped value. */
                (model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
              ))}
            </select>

            {/* 3. TYPE */}
            <select
              value={filterType}
              onChange={
                /* Handles the change callback for this rendered control.
                 * It accepts e and returns the delegated result. */
                (e) => {
                  setFilterType(e.target.value);
                  resetPage();
                }}
            >
              <option value="">All Categories</option>
              {displayedTypes.map(
                /* Transforms each collection entry for the surrounding mapping.
                 * It accepts type and returns the mapped value. */
                (type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
              ))}
            </select>

            {/* 4. LOCATION */}
            <select
              value={filterLocation}
              onChange={
                /* Handles the change callback for this rendered control.
                 * It accepts e and returns the delegated result. */
                (e) => {
                  setFilterLocation(e.target.value);
                  resetPage();
                }}
            >
              <option value="">All Locations</option>
              {displayedLocations.map(
                /* Transforms each collection entry for the surrounding mapping.
                 * It accepts location and returns the mapped value. */
                (location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
              ))}
            </select>

            {/* 5. SEATS (NEW) */}
            <select
              value={filterSeats}
              onChange={
                /* Handles the change callback for this rendered control.
                 * It accepts e and returns the delegated result. */
                (e) => {
                  setFilterSeats(e.target.value);
                  resetPage();
                }}
            >
              <option value="">All Seats</option>
              {displayedSeats.map(
                /* Transforms each collection entry for the surrounding mapping.
                 * It accepts seatNum and returns the mapped value. */
                (seatNum) => (
                  <option key={seatNum} value={seatNum}>
                    {seatNum} Seats
                  </option>
              ))}
            </select>

            {/* 6. SORTING */}
            <select
              value={sortOption}
              onChange={
                /* Handles the change callback for this rendered control.
                 * It accepts e and returns the delegated result. */
                (e) => {
                  setSortOption(e.target.value);
                  resetPage();
                }}
            >
              <option value="">Sort: Newest Added</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="year_desc">Year: Newest</option>
              <option value="year_asc">Year: Oldest</option>
              <option value="seats_desc">Seats: Most to Least</option>
              <option value="seats_asc">Seats: Least to Most</option>
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
          allVehicles.map(
            /* Transforms each collection entry for the surrounding mapping.
             * It accepts veh and returns the mapped value. */
            (veh) => (
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
          handlePrevPage={previousPage}
          handleNextPage={nextPage}
          leftText={`Showing ${allVehicles?.length || 0} of ${allVehPagination?.totalVehicles || 0} vehicles`}
        />
      )}
    </div>
  );
};

export default Vehicles;
