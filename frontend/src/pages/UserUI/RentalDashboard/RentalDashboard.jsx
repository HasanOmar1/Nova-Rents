import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./RentalDashboard.module.css";
import {
  Calendar,
  Car,
  CheckCircle,
  Clock,
  CreditCard,
  Info,
  Layers,
} from "lucide-react";
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

const isAwaitingPayment = (rental) =>
  rental.rentalStatus === "approved" &&
  rental.paymentStatus === "pending" &&
  Boolean(rental.paymentToken);

const isWaitingForApproval = (rental) => rental.rentalStatus === "pending";

const matchesTripStatus = (rental, status) => {
  if (status === "all") return true;
  if (status === "rejected") {
    return (
      rental.rentalStatus === "rejected" || rental.rentalStatus === "declined"
    );
  }
  return rental.rentalStatus === status;
};

const compareTripsByStartDate = (firstTrip, secondTrip) =>
  new Date(firstTrip.startDate).getTime() -
    new Date(secondTrip.startDate).getTime() ||
  Number(firstTrip.rentalId) - Number(secondTrip.rentalId);

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatRentalTotal = (totalPrice) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(totalPrice) || 0);

const RentalDashboard = () => {
  const navigate = useNavigate();
  const {
    fetchRentalHistory,
    rentalHistory,
    historyLoading,
    respondToRequest,
  } = useRentContext();

  const [pendingPage, setPendingPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [approvalPage, setApprovalPage] = useState(1);
  const [tripsPage, setTripsPage] = useState(1);
  const [tripStatusFilter, setTripStatusFilter] = useState("all");
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
          : rentalHistory.myTrips.filter(
              (rental) => !isWaitingForApproval(rental),
            );

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
  const tripHistory = myTrips.filter((rental) => !isWaitingForApproval(rental));
  const groupedTripHistory = groupByVehicle(tripHistory);
  const groupedTrips =
    tripStatusFilter === "all"
      ? groupedTripHistory
      : groupedTripHistory.filter((group) =>
          group.rentals.some((rental) =>
            matchesTripStatus(rental, tripStatusFilter),
          ),
        );
  const awaitingPayments = myTrips
    .filter(isAwaitingPayment)
    .slice()
    .sort(compareTripsByStartDate);
  const waitingForApproval = myTrips
    .filter(isWaitingForApproval)
    .slice()
    .sort(compareTripsByStartDate);

  const totalPendingPages = Math.ceil(groupedPending.length / ITEMS_PER_PAGE);
  const totalPaymentPages = Math.ceil(awaitingPayments.length / ITEMS_PER_PAGE);
  const currentPaymentPage = Math.min(
    paymentPage,
    Math.max(totalPaymentPages, 1),
  );
  const totalApprovalPages = Math.ceil(
    waitingForApproval.length / ITEMS_PER_PAGE,
  );
  const currentApprovalPage = Math.min(
    approvalPage,
    Math.max(totalApprovalPages, 1),
  );
  const totalTripsPages = Math.ceil(groupedTrips.length / ITEMS_PER_PAGE);

  const displayedPending = groupedPending.slice(
    (pendingPage - 1) * ITEMS_PER_PAGE,
    pendingPage * ITEMS_PER_PAGE,
  );

  const displayedPayments = awaitingPayments.slice(
    (currentPaymentPage - 1) * ITEMS_PER_PAGE,
    currentPaymentPage * ITEMS_PER_PAGE,
  );

  const displayedApprovals = waitingForApproval.slice(
    (currentApprovalPage - 1) * ITEMS_PER_PAGE,
    currentApprovalPage * ITEMS_PER_PAGE,
  );

  const displayedTrips = groupedTrips.slice(
    (tripsPage - 1) * ITEMS_PER_PAGE,
    tripsPage * ITEMS_PER_PAGE,
  );

  const completedCount = myTrips.filter(
    (t) => t.rentalStatus === "completed",
  ).length;
  const approvedCount = myTrips.filter(
    (t) => t.rentalStatus === "approved",
  ).length;
  const rejectedCount = myTrips.filter((trip) =>
    matchesTripStatus(trip, "rejected"),
  ).length;
  const cancelledCount = myTrips.filter(
    (t) => t.rentalStatus === "cancelled",
  ).length;

  const selectedTripStatusLabel =
    tripStatusFilter === "all"
      ? "All statuses"
      : `${tripStatusFilter.charAt(0).toUpperCase()}${tripStatusFilter.slice(1)}`;

  const handleTripStatusChange = (event) => {
    setTripStatusFilter(event.target.value);
    setTripsPage(1);
  };

  return (
    <div className={`${styles.RentalDashboard} page`}>
      <RentalRequestsModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        groupData={modalConfig.groupData}
        mode={modalConfig.mode}
        initialTripFilter={tripStatusFilter}
        respondToRequest={respondToRequest}
      />

      <div className={styles.header}>
        <h1>Rental Dashboard</h1>
        <p>Manage incoming requests, required payments, and trip history.</p>
      </div>

      {awaitingPayments.length > 0 && (
        <div
          className={`${styles.section} ${styles.paymentSection}`}
          role="region"
          aria-labelledby="awaiting-payment-heading"
        >
          <div className={styles.paymentSectionHeader}>
            <div>
              <h2 id="awaiting-payment-heading">
                <CreditCard size={21} /> Payment Required: Approved Rentals
              </h2>
              <p className={styles.paymentIntro}>
                The vehicle owner approved your rental. Complete the remaining
                payment step to confirm your booking and unlock pickup details.
              </p>
            </div>
            <span className={styles.paymentCountBadge}>
              {awaitingPayments.length} awaiting payment
            </span>
          </div>

          <div className={`${styles.grid} ${styles.paymentGrid}`}>
            {displayedPayments.map((rental) => {
              const vehicleName =
                `${rental.brandName || ""} ${rental.modelName || ""}`.trim() ||
                "Vehicle";
              const ownerName =
                `${rental.ownerFirstName || ""} ${rental.ownerLastName || ""}`.trim();

              return (
                <article
                  key={rental.rentalId}
                  className={`${styles.card} ${styles.paymentCard}`}
                >
                  <div className={styles.paymentImageWrapper}>
                    <img
                      src={parseImgs(rental.image)}
                      alt={vehicleName}
                      className={styles.carImg}
                    />
                  </div>

                  <div className={styles.cardContent}>
                    <div className={styles.paymentCardHeading}>
                      <h3>{vehicleName}</h3>
                      <span className={styles.approvedBadge}>
                        <CheckCircle size={14} /> Approved - Payment required
                      </span>
                    </div>

                    <div className={styles.paymentDetails}>
                      <p>
                        <Car size={14} /> Plate: {rental.licensePlate}
                      </p>
                      <p>
                        <Calendar size={14} /> {formatDate(rental.startDate)} -{" "}
                        {formatDate(rental.endDate)}
                      </p>
                      {ownerName && <p>Vehicle owner: {ownerName}</p>}
                    </div>

                    <div className={styles.paymentTotalRow}>
                      <span>Rental total</span>
                      <strong>{formatRentalTotal(rental.totalPrice)}</strong>
                    </div>

                    <p className={styles.paymentClarityCopy}>
                      Your request is accepted. Only payment is left before the
                      rental is confirmed.
                    </p>

                    <div className={styles.paymentActions}>
                      <button
                        type="button"
                        className={styles.payNowBtn}
                        onClick={() =>
                          navigate(
                            `/payments/${encodeURIComponent(rental.paymentToken)}`,
                          )
                        }
                        aria-label={`Pay for ${vehicleName} rental`}
                      >
                        <CreditCard size={16} /> Pay Now
                      </button>
                      <button
                        type="button"
                        className={styles.paymentDetailsBtn}
                        onClick={() => handleViewDetails(rental)}
                        aria-label={`View details for ${vehicleName}`}
                      >
                        <Info size={16} /> Vehicle Details
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {totalPaymentPages > 1 && (
            <div className={styles.paginationWrapper}>
              <Pagination
                currentPage={currentPaymentPage}
                totalPages={totalPaymentPages}
                handlePrevPage={() =>
                  setPaymentPage(Math.max(currentPaymentPage - 1, 1))
                }
                handleNextPage={() =>
                  setPaymentPage(
                    Math.min(currentPaymentPage + 1, totalPaymentPages),
                  )
                }
                leftText={`Approved rentals awaiting payment: ${awaitingPayments.length}`}
              />
            </div>
          )}
        </div>
      )}

      {awaitingPayments.length > 0 && <hr className={styles.divider} />}

      {waitingForApproval.length > 0 && (
        <section
          className={`${styles.section} ${styles.approvalSection}`}
          aria-labelledby="waiting-for-approval-heading"
        >
          <div className={styles.approvalSectionHeader}>
            <div>
              <h2 id="waiting-for-approval-heading">
                <Clock size={21} /> Waiting for Owner Approval
              </h2>
              <p className={styles.approvalIntro}>
                These rental requests were sent and are waiting for the vehicle
                owner to accept or decline them.
              </p>
            </div>
            <span className={styles.approvalCountBadge}>
              {waitingForApproval.length} pending
            </span>
          </div>

          <div className={`${styles.grid} ${styles.paymentGrid}`}>
            {displayedApprovals.map((rental) => {
              const vehicleName =
                `${rental.brandName || ""} ${rental.modelName || ""}`.trim() ||
                "Vehicle";
              const ownerName =
                `${rental.ownerFirstName || ""} ${rental.ownerLastName || ""}`.trim();

              return (
                <article
                  key={rental.rentalId}
                  className={`${styles.card} ${styles.approvalCard}`}
                >
                  <div className={styles.paymentImageWrapper}>
                    <img
                      src={parseImgs(rental.image)}
                      alt={vehicleName}
                      className={styles.carImg}
                    />
                  </div>

                  <div className={styles.cardContent}>
                    <div className={styles.paymentCardHeading}>
                      <h3>{vehicleName}</h3>
                      <span className={styles.pendingApprovalBadge}>
                        <Clock size={14} /> Pending owner approval
                      </span>
                    </div>

                    <div className={styles.paymentDetails}>
                      <p>
                        <Car size={14} /> Plate: {rental.licensePlate}
                      </p>
                      <p>
                        <Calendar size={14} /> {formatDate(rental.startDate)} -{" "}
                        {formatDate(rental.endDate)}
                      </p>
                      {ownerName && <p>Vehicle owner: {ownerName}</p>}
                    </div>

                    <div className={styles.paymentTotalRow}>
                      <span>Requested rental total</span>
                      <strong>{formatRentalTotal(rental.totalPrice)}</strong>
                    </div>

                    <p className={styles.paymentClarityCopy}>
                      Your request was sent. No payment is needed unless the
                      owner approves it.
                    </p>

                    <div
                      className={`${styles.paymentActions} ${styles.approvalActions}`}
                    >
                      <button
                        type="button"
                        className={styles.paymentDetailsBtn}
                        onClick={() => handleViewDetails(rental)}
                        aria-label={`View details for ${vehicleName}`}
                      >
                        <Info size={16} /> Vehicle Details
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {totalApprovalPages > 1 && (
            <div className={styles.paginationWrapper}>
              <Pagination
                currentPage={currentApprovalPage}
                totalPages={totalApprovalPages}
                handlePrevPage={() =>
                  setApprovalPage(Math.max(currentApprovalPage - 1, 1))
                }
                handleNextPage={() =>
                  setApprovalPage(
                    Math.min(currentApprovalPage + 1, totalApprovalPages),
                  )
                }
                leftText={`Rental requests waiting for approval: ${waitingForApproval.length}`}
              />
            </div>
          )}
        </section>
      )}

      {waitingForApproval.length > 0 && <hr className={styles.divider} />}

      {groupedPending.length !== 0 && (
        <div className={styles.section}>
          <h2>
            <Clock size={20} color="#eab308" /> Action Required: Pending
            Requests
          </h2>

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
                      <Layers size={16} /> View {rentals.length} Pending Request
                      {rentals.length > 1 ? "s" : ""}
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
                handlePrevPage={() => setPendingPage((p) => Math.max(p - 1, 1))}
                handleNextPage={() =>
                  setPendingPage((p) => Math.min(p + 1, totalPendingPages))
                }
                leftText={`Vehicles with Requests: ${groupedPending.length}`}
              />
            </div>
          )}
          <hr className={styles.divider} />
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>
            <Car size={20} color="#3b82f6" /> My Trips
          </h2>
          <div className={styles.tripHeaderControls}>
            <div className={styles.tripFilterContainer}>
              <label htmlFor="trip-status-filter">Filter:</label>
              <select
                id="trip-status-filter"
                value={tripStatusFilter}
                onChange={handleTripStatusChange}
                aria-label="Filter My Trips by status"
              >
                <option value="all">All statuses</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className={styles.tripCounters}>
              <span className={`${styles.counterBadge} ${styles.approved}`}>
                Approved: {approvedCount}
              </span>
              <span className={`${styles.counterBadge} ${styles.completed}`}>
                Completed: {completedCount}
              </span>
              <span className={`${styles.counterBadge} ${styles.rejected}`}>
                Rejected: {rejectedCount}
              </span>
              <span className={`${styles.counterBadge} ${styles.cancelled}`}>
                Cancelled: {cancelledCount}
              </span>
            </div>
          </div>
        </div>

        {groupedTrips.length === 0 ? (
          <p className={styles.emptyMsg}>
            {myTrips.length === 0
              ? "You haven't rented any cars yet."
              : tripHistory.length === 0
                ? "No approved or past trips yet."
                : `No ${selectedTripStatusLabel.toLowerCase()} trips found.`}
          </p>
        ) : (
          <>
            <div className={styles.grid}>
              {displayedTrips.map((group) => {
                const { vehicleInfo, rentals } = group;
                const matchingTrips =
                  tripStatusFilter === "all"
                    ? rentals.length
                    : rentals.filter(
                        (rental) =>
                          matchesTripStatus(rental, tripStatusFilter),
                      ).length;

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

                      {tripStatusFilter !== "all" && (
                        <span
                          className={`${styles.tripFilterMatchBadge} ${styles[tripStatusFilter]}`}
                        >
                          {matchingTrips} {selectedTripStatusLabel} trip
                          {matchingTrips > 1 ? "s" : ""}
                        </span>
                      )}

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
                        <Layers size={16} /> View {matchingTrips}{" "}
                        {tripStatusFilter === "all"
                          ? "Trip"
                          : `${selectedTripStatusLabel} Trip`}
                        {matchingTrips > 1 ? "s" : ""}
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
                  leftText={
                    tripStatusFilter === "all"
                      ? `Rented Vehicles: ${groupedTrips.length}`
                      : `Vehicles with ${selectedTripStatusLabel} Trips: ${groupedTrips.length}`
                  }
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
