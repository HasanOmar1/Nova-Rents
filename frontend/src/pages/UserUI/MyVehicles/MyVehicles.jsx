import { useState, useEffect } from "react";
import DeleteMenu from "../../../components/DeleteMenu/DeleteMenu";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import VehiclesCardsTable from "../../../components/VehiclesCardsTable/VehiclesCardsTable";
import styles from "./MyVehicles.module.css";
import { Car, ChevronLeft, ChevronRight } from "lucide-react";
import { useVehicleContext } from "../../../context/VehicleContext";
import AddEditVehicleMenu from "../../../components/AddEditVehicleMenu/AddEditVehicleMenu";

const MyVehicles = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const { getUserVehicles, userVehicles, vehicleStats, pagination } =
    useVehicleContext();

  useEffect(() => {
    getUserVehicles(currentPage, statusFilter);
  }, [currentPage, statusFilter]);

  useEffect(() => {
    if (pagination?.totalPages && currentPage > pagination.totalPages) {
      setCurrentPage(pagination.totalPages || 1);
    }
  }, [pagination?.totalPages, currentPage]);

  const openAddVehMenu = () => setIsOpen(true);
  const closeAddVehMenu = () => setIsOpen(false);

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleNextPage = () => {
    if (pagination?.currentPage < pagination?.totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (pagination?.currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const topData = [
    {
      title: "Active listings",
      value: vehicleStats?.activeListings || 0,
      icon: <Car size={28} color="#a7d2eb" />,
    },
    {
      title: "Available now",
      value: vehicleStats?.availableNow || 0,
      icon: <Car size={28} color="#a7d2eb" />,
    },
    {
      title: "Avg. daily rate",
      value: `$${vehicleStats?.avgRate || 0}`,
      icon: <Car size={28} color="#a7d2eb" />,
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
          <button className={styles.addVehicleBtn} onClick={openAddVehMenu}>
            Add vehicle
          </button>

          <div className={styles.filterContainer}>
            <label htmlFor="status">Filter:</label>
            <select
              name="status"
              value={statusFilter}
              onChange={handleStatusChange}
            >
              <option value="all">All Vehicles</option>
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive / Deleted</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.topCardsContainer}>
        {topData.map((item) => (
          <HomeTopCards
            key={crypto.randomUUID()}
            title={item.title}
            value={item.value}
            icon={item.icon}
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
            {userVehicles.map((veh, i) => (
              <div key={veh.licensePlate}>
                <VehiclesCardsTable veh={veh} />
                {i < userVehicles.length - 1 && <hr />}
              </div>
            ))}

            <div className={styles.pagination}>
              <p>Total Vehicles: {pagination?.totalVehicles}</p>

              <div className={styles.pagBtnsContainer}>
                <button onClick={handlePrevPage} disabled={currentPage === 1}>
                  <ChevronLeft size={20} /> Prev
                </button>

                <p>
                  Page {pagination?.currentPage} / {pagination?.totalPages}
                </p>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage === pagination?.totalPages}
                >
                  Next <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className={styles.noVehicles}>
            No vehicles found for this status.
          </p>
        )}
      </div>

      <AddEditVehicleMenu isOpen={isOpen} onClose={closeAddVehMenu} />
    </div>
  );
};

export default MyVehicles;
