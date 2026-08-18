import { useState, useEffect } from "react";
import styles from "./AllVehicles.module.css";
import {
  Car,
  CheckCircle2,
  CalendarClock,
  Wrench,
  ShieldOff,
} from "lucide-react";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import { useVehicleContext } from "../../../context/VehicleContext";
import VehiclesCardsTable from "../../../components/VehiclesCardsTable/VehiclesCardsTable";
import Pagination from "../../../components/Pagination/Pagination";
import AddBrandVehicleMenu from "../../../components/AddBrandVehicleMenu/AddBrandVehicleMenu";
import { usePaginatedStatusFilter } from "../../../hooks/usePaginatedStatusFilter";

const AllVehicles = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { getAdminVehicles, allVehicles, allVehStats, allVehPagination } =
    useVehicleContext();
  const {
    currentPage,
    nextPage,
    previousPage,
    statusFilter,
    handleStatusChange,
  } = usePaginatedStatusFilter({
    totalPages: allVehPagination?.totalPages,
  });

  useEffect(() => {
    getAdminVehicles({ status: statusFilter }, currentPage);
  }, [getAdminVehicles, statusFilter, currentPage]);

  const totalVehicles = Number(allVehPagination?.totalVehicles) || 0;
  const pageLimit = Number(allVehPagination?.limit) || 6;
  const firstVehicleNumber = allVehicles?.length
    ? (currentPage - 1) * pageLimit + 1
    : 0;
  const lastVehicleNumber = allVehicles?.length
    ? firstVehicleNumber + allVehicles.length - 1
    : 0;

  const openAddBrandMenu = () => setIsOpen(true);
  const closeAddBrandMenu = () => setIsOpen(false);

  const topData = [
    {
      title: "Total in system",
      value: allVehStats?.total || 0,
      icon: <Car size={28} color="#a7d2eb" />,
      onClick: () => handleStatusChange("all"),
      isAction: true,
    },
    {
      title: "Available",
      value: allVehStats?.available || 0,
      icon: <CheckCircle2 size={28} color="#a7d2eb" />,
      onClick: () => handleStatusChange("available"),
      isAction: true,
    },
    {
      title: "Rented",
      value: allVehStats?.rented || 0,
      icon: <CalendarClock size={28} color="#a7d2eb" />,
      onClick: () => handleStatusChange("rented"),
      isAction: true,
    },
    {
      title: "Maintenance",
      value: allVehStats?.maintenance || 0,
      icon: <Wrench size={28} color="#a7d2eb" />,
      onClick: () => handleStatusChange("maintenance"),
      isAction: true,
    },
    {
      title: "Inactive",
      value: allVehStats?.inactive || 0,
      icon: <ShieldOff size={28} color="#a7d2eb" />,
      onClick: () => handleStatusChange("inactive"),
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
        {topData.map((item) => (
          <HomeTopCards
            key={crypto.randomUUID()}
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
          <p>Location</p>
          <p>Price</p>
          <p>Owner</p>
          <p>Status</p>
        </div>
        <hr />

        {allVehicles?.length > 0 ? (
          <>
            {allVehicles.map((veh, i) => (
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
          <p className={styles.noVehicles}>
            No vehicles found for this status.
          </p>
        )}
      </div>

      <AddBrandVehicleMenu isOpen={isOpen} onClose={closeAddBrandMenu} />
    </div>
  );
};

export default AllVehicles;
