import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./RentalDashboard.module.css";
import { Car, Clock, Info, Layers } from "lucide-react";
import { useRentContext } from "../../../context/RentContext";
import { parseImgs } from "../../../utils/parseImgs";
import Pagination from "../../../components/Pagination/Pagination";
import RentalRequestsModal from "../../../components/RentalRequestsModal/RentalRequestsModal";

// takes an object and returns an array of the object values
const groupByVehicle = (rentalsArray) => {
  const groupedObj = {};

  rentalsArray.forEach((rental) => {
    const plate = rental.licensePlate;
    if (!groupedObj[plate]) {
      groupedObj[plate] = {
        vehicleInfo: rental,
        rentals: [],
      };
    }
    groupedObj[plate].rentals.push(rental);
  });

  return Object.values(groupedObj);
};

const RentalDashboard = () => {
  const navigate = useNavigate();
  const {
    fetchRentalHistory,
    rentalHistory,
    historyLoading,
    respondToRequest,
  } = useRentContext();

  const [pendingPage, setPendingPage] = useState(1);
  const [tripsPage, setTripsPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    groupData: null,
    mode: "",
  });

  useEffect(() => {
    fetchRentalHistory();
  }, []);

  useEffect(() => {
    if (modalConfig.isOpen && modalConfig.groupData) {
      const plate = modalConfig.groupData.vehicleInfo.licensePlate;

      const sourceArray =
        modalConfig.mode === "pending"
          ? rentalHistory.pendingRequests
          : rentalHistory.myTrips;

      const freshGroupData = groupByVehicle(sourceArray).find(
        (g) => g.vehicleInfo.licensePlate === plate,
      );

      setModalConfig((prev) => ({
        ...prev,
        groupData: freshGroupData || null,
      }));
    }
  }, [rentalHistory, modalConfig.isOpen]);

  const handleViewDetails = (vehicle) => {
    const formattedVehicle = {
      ...vehicle,
      vehName: `${vehicle.brandName} ${vehicle.modelName}`,
    };
    navigate(`/vehicles/${vehicle.licensePlate}`, { state: formattedVehicle });
  };

  const openModal = (group, mode) => {
    setModalConfig({ isOpen: true, groupData: group, mode });
  };

  const closeModal = () => {
    setModalConfig({ isOpen: false, groupData: null, mode: "" });
  };

  if (historyLoading) {
    return (
      <div className={`${styles.RentalDashboard} page`}>
        <p>Loading history...</p>
      </div>
    );
  }

  const { pendingRequests = [], myTrips = [] } = rentalHistory;

  const groupedPending = groupByVehicle(pendingRequests);
  const groupedTrips = groupByVehicle(myTrips);

  const totalPendingPages = Math.ceil(groupedPending.length / ITEMS_PER_PAGE);
  const totalTripsPages = Math.ceil(groupedTrips.length / ITEMS_PER_PAGE);

  const displayedPending = groupedPending.slice(
    (pendingPage - 1) * ITEMS_PER_PAGE,
    pendingPage * ITEMS_PER_PAGE,
  );

  const displayedTrips = groupedTrips.slice(
    (tripsPage - 1) * ITEMS_PER_PAGE,
    tripsPage * ITEMS_PER_PAGE,
  );

  const completedCount = myTrips.filter(
    (t) => t.rentalStatus === "completed",
  ).length;
  const pendingCount = myTrips.filter(
    (t) => t.rentalStatus === "pending",
  ).length;
  const rejectedCount = myTrips.filter(
    (t) => t.rentalStatus === "rejected",
  ).length;
  const cancelledCount = myTrips.filter(
    (t) => t.rentalStatus === "cancelled",
  ).length;

  return (
    <div className={`${styles.RentalDashboard} page`}>
      <RentalRequestsModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        groupData={modalConfig.groupData}
        mode={modalConfig.mode}
        respondToRequest={respondToRequest}
      />

      <div className={styles.header}>
        <h1>Rental Dashboard</h1>
        <p>Manage your incoming requests and view your past trips.</p>
      </div>

      <div className={styles.section}>
        <h2>
          <Clock size={20} color="#eab308" /> Action Required: Pending Requests
        </h2>
        {groupedPending.length === 0 ? (
          <p className={styles.emptyMsg}>
            You have no pending requests right now.
          </p>
        ) : (
          <>
            <div className={styles.grid}>
              {displayedPending.map((group) => {
                const { vehicleInfo, rentals } = group;

                return (
                  <div key={vehicleInfo.licensePlate} className={styles.card}>
                    <div
                      className={styles.imageWrapper}
                      onClick={() => handleViewDetails(vehicleInfo)}
                    >
                      <img
                        src={parseImgs(vehicleInfo.image)}
                        alt="Vehicle"
                        className={styles.carImg}
                      />
                      <div className={styles.imageOverlay}>
                        <Info size={24} />
                        <span>View Details</span>
                      </div>
                    </div>

                    <div className={styles.cardContent}>
                      <h3>
                        {vehicleInfo.brandName} {vehicleInfo.modelName}
                      </h3>
                      <p className={styles.plateText}>
                        <Car size={14} /> Plate: {vehicleInfo.licensePlate}
                      </p>

                      <button
                        className={styles.detailsBtn}
                        onClick={() => handleViewDetails(vehicleInfo)}
                      >
                        Vehicle Details
                      </button>

                      <button
                        className={styles.openModalBtn}
                        onClick={() => openModal(group, "pending")}
                      >
                        <Layers size={16} /> View {rentals.length} Pending
                        Request{rentals.length > 1 ? "s" : ""}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPendingPages > 1 && (
              <div className={styles.paginationWrapper}>
                <Pagination
                  currentPage={pendingPage}
                  totalPages={totalPendingPages}
                  handlePrevPage={() =>
                    setPendingPage((p) => Math.max(p - 1, 1))
                  }
                  handleNextPage={() =>
                    setPendingPage((p) => Math.min(p + 1, totalPendingPages))
                  }
                  leftText={`Vehicles with Requests: ${groupedPending.length}`}
                />
              </div>
            )}
          </>
        )}
      </div>

      <hr className={styles.divider} />

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>
            <Car size={20} color="#3b82f6" /> My Trips
          </h2>
          <div className={styles.tripCounters}>
            <span className={`${styles.counterBadge} ${styles.completed}`}>
              Completed: {completedCount}
            </span>
            <span className={`${styles.counterBadge} ${styles.pending}`}>
              Pending: {pendingCount}
            </span>
            <span className={`${styles.counterBadge} ${styles.rejected}`}>
              Rejected: {rejectedCount}
            </span>
            <span className={`${styles.counterBadge} ${styles.cancelled}`}>
              Cancelled: {cancelledCount}
            </span>
          </div>
        </div>

        {groupedTrips.length === 0 ? (
          <p className={styles.emptyMsg}>You haven't rented any cars yet.</p>
        ) : (
          <>
            <div className={styles.grid}>
              {displayedTrips.map((group) => {
                const { vehicleInfo, rentals } = group;

                return (
                  <div key={vehicleInfo.licensePlate} className={styles.card}>
                    <div
                      className={styles.imageWrapper}
                      onClick={() => handleViewDetails(vehicleInfo)}
                    >
                      <img
                        src={parseImgs(vehicleInfo.image)}
                        alt="Vehicle"
                        className={styles.carImg}
                      />
                      <div className={styles.imageOverlay}>
                        <Info size={24} />
                        <span>View Details</span>
                      </div>
                    </div>

                    <div className={styles.cardContent}>
                      <h3>
                        {vehicleInfo.brandName} {vehicleInfo.modelName}
                      </h3>
                      <p className={styles.plateText}>
                        <Car size={14} /> Plate: {vehicleInfo.licensePlate}
                      </p>

                      <button
                        className={styles.detailsBtn}
                        onClick={() => handleViewDetails(vehicleInfo)}
                      >
                        Vehicle Details
                      </button>

                      <button
                        className={styles.openModalBtn}
                        onClick={() => openModal(group, "trips")}
                      >
                        <Layers size={16} /> View {rentals.length} Trip
                        {rentals.length > 1 ? "s" : ""}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalTripsPages > 1 && (
              <div className={styles.paginationWrapper}>
                <Pagination
                  currentPage={tripsPage}
                  totalPages={totalTripsPages}
                  handlePrevPage={() => setTripsPage((p) => Math.max(p - 1, 1))}
                  handleNextPage={() =>
                    setTripsPage((p) => Math.min(p + 1, totalTripsPages))
                  }
                  leftText={`Rented Vehicles: ${groupedTrips.length}`}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RentalDashboard;
