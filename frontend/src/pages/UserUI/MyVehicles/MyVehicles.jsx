// Presents the signed-in owner's vehicles, metrics, and report details.
// It takes no props and returns the filterable vehicle-management page.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Car,
  CircleDollarSign,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  TrendingUp,
} from "lucide-react";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import VehiclesCardsTable from "../../../components/VehiclesCardsTable/VehiclesCardsTable";
import AddEditVehicleMenu from "../../../components/AddEditVehicleMenu/AddEditVehicleMenu";
import OwnerVehicleReportsModal from "../../../components/OwnerVehicleReportsModal/OwnerVehicleReportsModal";
import Pagination from "../../../components/Pagination/Pagination";
import { useVehicleContext } from "../../../context/VehicleContext";
import { useComplaintContext } from "../../../context/ComplaintContext";
import { usePaginatedStatusFilter } from "../../../hooks/usePaginatedStatusFilter";
import styles from "./MyVehicles.module.css";

// Loads and renders the owner's paginated vehicle-management dashboard.
// It takes no props and returns vehicle cards, controls, and modal JSX.
const MyVehicles = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { getUserVehicles, userVehicles, vehicleStats, pagination } =
    useVehicleContext();
  const { ownerVehicleReports, getOwnerVehicleReports } = useComplaintContext();
  const {
    currentPage,
    nextPage,
    previousPage,
    statusFilter,
    handleStatusChange,
  } = usePaginatedStatusFilter({ totalPages: pagination?.totalPages });
  const [selectedVehicleForReports, setSelectedVehicleForReports] =
    useState(null);

  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      getUserVehicles(currentPage, statusFilter);
    }, [currentPage, statusFilter]);

  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      getOwnerVehicleReports();
    }, []);

  const reportsByPlate = useMemo(
    /* Computes the memoized value used by this component.
     * It accepts no arguments and returns the derived value. */
    () => {
      const map = new Map();
      for (const report of ownerVehicleReports) {
        const key = String(report.vehicleLicensePlate);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(report);
      }
      return map;
    }, [ownerVehicleReports]);

  const selectedReports = selectedVehicleForReports
    ? reportsByPlate.get(String(selectedVehicleForReports.licensePlate)) || []
    : [];

  const selectedVehicleLabel = selectedVehicleForReports
    ? `${selectedVehicleForReports.brandName} ${selectedVehicleForReports.modelName}`
    : "";

  // Opens the add-vehicle menu by updating local visibility state.
  // It takes no arguments and returns the state setter's undefined result.
  const openAddVehMenu = () => setIsOpen(true);
  // Closes the add-vehicle menu by updating local visibility state.
  // It takes no arguments and returns the state setter's undefined result.
  const closeAddVehMenu = () => setIsOpen(false);

  const topData = [
    {
      title: "Vehicles Count",
      value: vehicleStats?.allVehicles || 0,
      icon: <Car size={28} color="#a7d2eb" />,
      onClick:
        /* Handles the click callback for this rendered control.
         * It accepts no arguments and returns the delegated result. */
        () => handleStatusChange("all"),
      isAction: true,
    },
    {
      title: "Available Now",
      value: vehicleStats?.availableNow || 0,
      icon: <ShieldCheck size={28} color="#a7d2eb" />,
      isAction: true,
      onClick:
        /* Handles the click callback for this rendered control.
         * It accepts no arguments and returns the delegated result. */
        () => handleStatusChange("available"),
    },
    {
      title: "Under Maintenance",
      value: vehicleStats?.maintenance || 0,
      icon: <ShieldAlert size={28} color="#a7d2eb" />,
      isAction: true,
      onClick:
        /* Handles the click callback for this rendered control.
         * It accepts no arguments and returns the delegated result. */
        () => handleStatusChange("maintenance"),
    },
    {
      title: "Inactive",
      value: vehicleStats?.inactive || 0,
      icon: <ShieldOff size={28} color="#a7d2eb" />,
      isAction: true,
      onClick:
        /* Handles the click callback for this rendered control.
         * It accepts no arguments and returns the delegated result. */
        () => handleStatusChange("inactive"),
    },
    {
      title: "Avg. daily rate",
      value: `$${(vehicleStats?.avgRate || 0).toLocaleString()}`,
      icon: <CircleDollarSign size={28} color="#a7d2eb" />,
    },
  ];

  return (
    <div className={`${styles.MyVehicles} page`}>
      <h1>My vehicles</h1>

      <div className={styles.headerControls}>
        <div className={styles.headerLeft}>
          <p>Your listings only — add, edit, or remove vehicles.</p>
        </div>

        <div className={styles.headerRight}>
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
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <Link className={styles.analyticsBtn} to="/myVehicles/analytics">
            <TrendingUp size={17} aria-hidden="true" />
            Vehicle performance
            <ArrowRight size={16} aria-hidden="true" />
          </Link>

          <button className={styles.addVehicleBtn} onClick={openAddVehMenu}>
            Add vehicle
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
              title={item.title}
              value={item.value}
              icon={item.icon}
              onClick={item.onClick}
              isAction={item.isAction}
            />
        ))}
      </div>

      <div className={styles.myVehiclesContainer}>
        <div className={styles.titles}>
          <p className={styles.vehicleTitle}>Vehicle</p>
          <p>Category</p>
          <p>Address</p>
          <p>Price</p>
          <p>Status</p>
          <p>Actions</p>
        </div>
        <hr />

        {userVehicles?.length ? (
          <>
            {userVehicles.map(
              /* Transforms each collection entry for the surrounding mapping.
               * It accepts veh and i and returns the mapped value. */
              (veh, i) => (
                <div key={veh.licensePlate}>
                  <VehiclesCardsTable
                    veh={veh}
                    activeReportCount={
                      reportsByPlate.get(String(veh.licensePlate))?.length || 0
                    }
                    onViewReports={setSelectedVehicleForReports}
                  />
                  {i < userVehicles.length - 1 && <hr />}
                </div>
            ))}

            <Pagination
              currentPage={pagination?.currentPage}
              totalPages={pagination?.totalPages}
              handlePrevPage={previousPage}
              handleNextPage={nextPage}
              leftText={`Total Vehicles: ${pagination?.totalVehicles || 0}`}
            />
          </>
        ) : (
          <p className={styles.noVehicles}>
            No vehicles found for this status.
          </p>
        )}
      </div>

      <AddEditVehicleMenu isOpen={isOpen} onClose={closeAddVehMenu} />

      <OwnerVehicleReportsModal
        isOpen={Boolean(selectedVehicleForReports)}
        onClose={
          /* Handles the close callback for this rendered control.
           * It accepts no arguments and returns the delegated result. */
          () => setSelectedVehicleForReports(null)}
        vehicleLabel={selectedVehicleLabel}
        reports={selectedReports}
      />
    </div>
  );
};

export default MyVehicles;
