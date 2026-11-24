// Presents the admin vehicle inventory with search and status filters.
// It takes no props and returns inventory metrics, rows, and edit controls.
import { useState, useEffect } from "react";
import styles from "./AllVehicles.module.css";
import {
  Car,
  CheckCircle2,
  AlertTriangle,
  Ban,
  CalendarClock,
  Wrench,
  ShieldOff,
  Search,
  X,
} from "lucide-react";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import { useVehicleContext } from "../../../context/VehicleContext";
import VehiclesCardsTable from "../../../components/VehiclesCardsTable/VehiclesCardsTable";
import Pagination from "../../../components/Pagination/Pagination";
import AddBrandVehicleMenu from "../../../components/AddBrandVehicleMenu/AddBrandVehicleMenu";
import { usePaginatedStatusFilter } from "../../../hooks/usePaginatedStatusFilter";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";

const STATUS_LABELS = {
  available: "Available",
  not_validated: "Not validated",
  unavailable: "Unavailable",
  rented: "Rented",
  maintenance: "Maintenance",
  inactive: "Inactive",
};

const MAX_SEARCH_LENGTH = 100;

/* Renders the all vehicles view and coordinates its page state.
 * It accepts no arguments and returns the rendered page JSX. */
const AllVehicles = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const { getAdminVehicles, allVehicles, allVehStats, allVehPagination } =
    useVehicleContext();
  const {
    currentPage,
    nextPage,
    previousPage,
    resetPage,
    statusFilter,
    handleStatusChange,
  } = usePaginatedStatusFilter({
    totalPages: allVehPagination?.totalPages,
  });
  const debouncedSearch = useDebouncedValue(searchInput, 300, resetPage);
  const normalizedSearch = debouncedSearch.trim();

  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      getAdminVehicles(
        { status: statusFilter, search: normalizedSearch },
        currentPage,
      );
    }, [getAdminVehicles, statusFilter, normalizedSearch, currentPage]);

  const totalVehicles = Number(allVehPagination?.totalVehicles) || 0;
  const pageLimit = Number(allVehPagination?.limit) || 6;
  const firstVehicleNumber = allVehicles?.length
    ? (currentPage - 1) * pageLimit + 1
    : 0;
  const lastVehicleNumber = allVehicles?.length
    ? firstVehicleNumber + allVehicles.length - 1
    : 0;

  /* Opens the vehicle brand management menu.
   * It accepts no arguments and returns undefined. */
  const openAddBrandMenu = () => setIsOpen(true);
  /* Closes the vehicle brand management menu.
   * It accepts no arguments and returns undefined. */
  const closeAddBrandMenu = () => setIsOpen(false);
  /* Clears the inventory search input.
   * It accepts no arguments and returns undefined. */
  const clearSearch = () => setSearchInput("");
  const selectedStatusLabel = STATUS_LABELS[statusFilter];
  const resultSummary = [
    `${totalVehicles.toLocaleString()} ${totalVehicles === 1 ? "vehicle" : "vehicles"}`,
    normalizedSearch ? `matching “${normalizedSearch}”` : "",
    selectedStatusLabel ? `with status ${selectedStatusLabel}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const emptyMessage = normalizedSearch
    ? `No vehicles match “${normalizedSearch}”${
        selectedStatusLabel ? ` with status ${selectedStatusLabel}` : ""
      }.`
    : selectedStatusLabel
      ? `No vehicles currently have status ${selectedStatusLabel}.`
      : "No vehicles are currently listed in the system.";

  const topData = [
    {
      title: "Total in system",
      value: allVehStats?.total || 0,
      icon: <Car size={28} color="#a7d2eb" />,
      onClick:
        /* Handles the click callback for this rendered control.
         * It accepts no arguments and returns the delegated result. */
        () => handleStatusChange("all"),
      isAction: true,
    },
    {
      title: "Available",
      value: allVehStats?.available || 0,
      icon: <CheckCircle2 size={28} color="#a7d2eb" />,
      onClick:
        /* Handles the click callback for this rendered control.
         * It accepts no arguments and returns the delegated result. */
        () => handleStatusChange("available"),
      isAction: true,
    },
    {
      title: "Not validated",
      value: allVehStats?.notValidated ?? allVehStats?.not_validated ?? 0,
      icon: <AlertTriangle size={28} color="#f9e081" />,
      onClick:
        /* Handles the click callback for this rendered control.
         * It accepts no arguments and returns the delegated result. */
        () => handleStatusChange("not_validated"),
      isAction: true,
    },
    {
      title: "Unavailable",
      value: allVehStats?.unavailable || 0,
      icon: <Ban size={28} color="#fb7185" />,
      onClick:
        /* Handles the click callback for this rendered control.
         * It accepts no arguments and returns the delegated result. */
        () => handleStatusChange("unavailable"),
      isAction: true,
    },
    {
      title: "Rented",
      value: allVehStats?.rented || 0,
      icon: <CalendarClock size={28} color="#a7d2eb" />,
      onClick:
        /* Handles the click callback for this rendered control.
         * It accepts no arguments and returns the delegated result. */
        () => handleStatusChange("rented"),
      isAction: true,
    },
    {
      title: "Maintenance",
      value: allVehStats?.maintenance || 0,
      icon: <Wrench size={28} color="#a7d2eb" />,
      onClick:
        /* Handles the click callback for this rendered control.
         * It accepts no arguments and returns the delegated result. */
        () => handleStatusChange("maintenance"),
      isAction: true,
    },
    {
      title: "Inactive",
      value: allVehStats?.inactive || 0,
      icon: <ShieldOff size={28} color="#a7d2eb" />,
      onClick:
        /* Handles the click callback for this rendered control.
         * It accepts no arguments and returns the delegated result. */
        () => handleStatusChange("inactive"),
      isAction: true,
    },
  ];

  return (
    <div className={`${styles.AllVehicles} page`}>
      <h1>All vehicles</h1>

      <div className={styles.headerControls}>
        <div className={styles.headerLeft}>
          <p>
            System-wide inventory — every listing, status, and who holds the
            listing.
          </p>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.searchContainer}>
            <Search
              size={18}
              className={styles.searchIcon}
              aria-hidden="true"
            />
            <label className={styles.visuallyHidden} htmlFor="vehicle-search">
              Search vehicles
            </label>
            <input
              id="vehicle-search"
              type="search"
              value={searchInput}
              onChange={
                /* Handles the change callback for this rendered control.
                 * It accepts event and returns the delegated result. */
                (event) => setSearchInput(event.target.value)}
              placeholder="Plate, owner, vehicle, or location"
              maxLength={MAX_SEARCH_LENGTH}
              autoComplete="off"
              title="Search by license plate, owner name, email, phone, make, model, or location"
            />
            {searchInput && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={clearSearch}
                aria-label="Clear vehicle search"
                title="Clear search"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className={styles.filterContainer}>
            <label htmlFor="status">Filter:</label>
            <select
              id="status"
              name="status"
              value={statusFilter}
              onChange={handleStatusChange}
            >
              <option value="all">All Vehicles</option>
              <option value="available">Available</option>
              <option value="not_validated">Not validated</option>
              <option value="unavailable">Unavailable</option>
              <option value="rented">Rented</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <button className={styles.addBrandBtn} onClick={openAddBrandMenu}>
            Add Brand
          </button>
        </div>
      </div>

      <div className={styles.topCardsContainer}>
        {topData.map(
          /* Transforms each collection entry for the surrounding mapping.
           * It accepts item and returns the mapped value. */
          (item) => (
            <HomeTopCards
              key={item.title}
              className={styles.vehicleStatCard}
              title={item.title}
              value={item.value}
              icon={item.icon}
              onClick={item.onClick}
              isAction={item.isAction}
            />
        ))}
      </div>

      <p className={styles.resultsSummary} role="status" aria-live="polite">
        {resultSummary}
      </p>

      <div className={styles.myVehiclesContainer}>
        <div className={styles.titles}>
          <p className={styles.vehicleTitle}>Vehicle</p>
          <p>Category</p>
          <p>Location</p>
          <p>Price</p>
          <p>Owner</p>
          <p>Status</p>
        </div>
        <hr />

        {allVehicles?.length > 0 ? (
          <>
            {allVehicles.map(
              /* Transforms each collection entry for the surrounding mapping.
               * It accepts veh and i and returns the mapped value. */
              (veh, i) => (
                <div key={veh.licensePlate}>
                  <VehiclesCardsTable veh={veh} admin />
                  {i < allVehicles.length - 1 && <hr />}
                </div>
            ))}
            <Pagination
              currentPage={currentPage}
              totalPages={allVehPagination?.totalPages}
              handlePrevPage={previousPage}
              handleNextPage={nextPage}
              leftText={`Showing ${firstVehicleNumber}-${lastVehicleNumber} of ${totalVehicles} vehicles`}
            />
          </>
        ) : (
          <p className={styles.noVehicles}>{emptyMessage}</p>
        )}
      </div>

      <AddBrandVehicleMenu isOpen={isOpen} onClose={closeAddBrandMenu} />
    </div>
  );
};

export default AllVehicles;
