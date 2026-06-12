import { useEffect, useState, useMemo } from "react";
import styles from "./Vehicles.module.css";
import VehiclesCards from "../../../components/VehiclesCards/VehiclesCards";
import { Link } from "react-router-dom";
import { useVehicleContext } from "../../../context/VehicleContext";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  const displayedModels = useMemo(() => {
    return filterBrand
      ? availableFilters.models?.filter((m) => m.brand === filterBrand) || []
      : availableFilters.models || [];
  }, [filterBrand, availableFilters.models]);

  const displayedTypes = useMemo(() => {
    if (!availableFilters.combinations) return availableFilters.types || [];
    return [
      ...new Set(
        availableFilters.combinations
          .filter((c) => {
            const matchBrand = filterBrand ? c.brandName === filterBrand : true;
            const matchModel = filterModel ? c.modelName === filterModel : true;
            return matchBrand && matchModel;
          })
          .map((c) => c.carTypeName),
      ),
    ];
  }, [
    filterBrand,
    filterModel,
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
    let activeModel = filterModel;
    let activeType = filterType;
    let activeLocation = filterLocation;

    if (filterModel && !displayedModels.some((m) => m.model === filterModel)) {
      activeModel = "";
      setFilterModel("");
    }
    if (filterType && !displayedTypes.includes(filterType)) {
      activeType = "";
      setFilterType("");
    }
    if (filterLocation && !displayedLocations.includes(filterLocation)) {
      activeLocation = "";
      setFilterLocation("");
    }

    const filters = {
      brand: filterBrand,
      model: activeModel,
      type: activeType,
      location: activeLocation,
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
    displayedModels,
    displayedTypes,
    displayedLocations,
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
