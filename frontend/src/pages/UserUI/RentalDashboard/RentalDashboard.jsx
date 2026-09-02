// Organizes the user's rental requests, payments, approvals, and trip history.
// It takes no props and returns status-filtered rental cards and dialogs.
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
import { formatShortDate } from "../../../utils/dateFormat";
import { useClientPagination } from "../../../hooks/useClientPagination";

const ITEMS_PER_PAGE = 6;

// Groups rental records by license plate for vehicle-based sections.
// It accepts a rental array and returns an array of grouped records.
const groupByVehicle = (rentalsArray) => {
  const groupedObj = {};

  rentalsArray.forEach(
    /* Processes one entry for the surrounding collection operation.
     * It accepts rental and returns undefined. */
    (rental) => {
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

/* Checks whether awaiting payment applies.
 * It accepts rental and returns a boolean result. */
const isAwaitingPayment = (rental) =>
  rental.rentalStatus === "approved" &&
  rental.paymentStatus === "pending" &&
  Boolean(rental.paymentToken);

/* Checks whether waiting for approval applies.
 * It accepts rental and returns a boolean result. */
const isWaitingForApproval = (rental) => rental.rentalStatus === "pending";

/* Checks whether trip status applies.
 * It accepts rental and status and returns a boolean result. */
const matchesTripStatus = (rental, status) => {
  if (status === "all") return true;
  if (status === "rejected") {
    return (
      rental.rentalStatus === "rejected" || rental.rentalStatus === "declined"
    );
  }
  return rental.rentalStatus === status;
};

/* Compares trips by start date for ordering.
 * It accepts firstTrip and secondTrip and returns a numeric ordering value. */
const compareTripsByStartDate = (firstTrip, secondTrip) =>
  new Date(firstTrip.startDate).getTime() -
    new Date(secondTrip.startDate).getTime() ||
  Number(firstTrip.rentalId) - Number(secondTrip.rentalId);

/* Formats rental total for display.
 * It accepts totalPrice and returns formatted display text. */
const formatRentalTotal = (totalPrice) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(totalPrice) || 0);

/* Renders the rental dashboard view and coordinates its page state.
 * It accepts no arguments and returns the rendered page JSX. */
const RentalDashboard = () => {
  const navigate = useNavigate();
  const {
    fetchRentalHistory,
    rentalHistory,
    historyLoading,
    respondToRequest,
  } = useRentContext();

  const [tripStatusFilter, setTripStatusFilter] = useState("all");

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    groupData: null,
    mode: "",
  });

  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      fetchRentalHistory();
    }, []);

  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      if (modalConfig.isOpen && modalConfig.groupData) {
        const plate = modalConfig.groupData.vehicleInfo.licensePlate;

        const sourceArray =
          modalConfig.mode === "pending"
            ? rentalHistory.pendingRequests
            : rentalHistory.myTrips.filter(
                /* Tests whether each collection entry belongs in the filtered result.
                 * It accepts rental and returns a boolean. */
                (rental) => !isWaitingForApproval(rental),
              );

        const freshGroupData = groupByVehicle(sourceArray).find(
          /* Checks whether the current entry is the requested match.
           * It accepts g and returns a boolean. */
          (g) => g.vehicleInfo.licensePlate === plate,
        );

        setModalConfig(
          /* Derives the next modal config state value.
           * It accepts prev and returns the replacement state. */
          (prev) => ({
            ...prev,
            groupData: freshGroupData || null,
          }));
      }
    }, [rentalHistory, modalConfig.isOpen]);

  /* Opens the detail route with normalized data for a selected vehicle.
   * It accepts a vehicle object and returns undefined. */
  const handleViewDetails = (vehicle) => {
    const formattedVehicle = {
      ...vehicle,
      vehName: `${vehicle.brandName} ${vehicle.modelName}`,
    };
    navigate(`/vehicles/${vehicle.licensePlate}`, { state: formattedVehicle });
  };

  /* Opens a rental modal for the selected vehicle group and mode.
   * It accepts a rental group and mode and returns undefined. */
  const openModal = (group, mode) => {
    setModalConfig({ isOpen: true, groupData: group, mode });
  };

  /* Closes the active rental modal.
   * It accepts no arguments and returns undefined. */
  const closeModal = () => {
    setModalConfig({ isOpen: false, groupData: null, mode: "" });
  };

  const { pendingRequests = [], myTrips = [] } = rentalHistory;

  const groupedPending = groupByVehicle(pendingRequests);
  const tripHistory = myTrips.filter(
    /* Tests whether each collection entry belongs in the filtered result.
     * It accepts rental and returns a boolean. */
    (rental) => !isWaitingForApproval(rental));
  const groupedTripHistory = groupByVehicle(tripHistory);
  const groupedTrips =
    tripStatusFilter === "all"
      ? groupedTripHistory
      : groupedTripHistory.filter(
        /* Tests whether each collection entry belongs in the filtered result.
         * It accepts group and returns a boolean. */
        (group) =>
          group.rentals.some(
            /* Checks whether the current entry satisfies the surrounding condition.
             * It accepts rental and returns a boolean. */
            (rental) =>
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

  const {
    currentPage: pendingPage,
    nextPage: nextPendingPage,
    paginatedItems: displayedPending,
    previousPage: previousPendingPage,
    totalPages: totalPendingPages,
  } = useClientPagination({
    items: groupedPending,
    pageSize: ITEMS_PER_PAGE,
  });
  const {
    currentPage: paymentPage,
    nextPage: nextPaymentPage,
    paginatedItems: displayedPayments,
    previousPage: previousPaymentPage,
    totalPages: totalPaymentPages,
  } = useClientPagination({
    items: awaitingPayments,
    pageSize: ITEMS_PER_PAGE,
  });
  const {
    currentPage: approvalPage,
    nextPage: nextApprovalPage,
    paginatedItems: displayedApprovals,
    previousPage: previousApprovalPage,
    totalPages: totalApprovalPages,
  } = useClientPagination({
    items: waitingForApproval,
    pageSize: ITEMS_PER_PAGE,
  });
  const {
    currentPage: tripsPage,
    nextPage: nextTripsPage,
    paginatedItems: displayedTrips,
    previousPage: previousTripsPage,
    totalPages: totalTripsPages,
  } = useClientPagination({
    items: groupedTrips,
    pageSize: ITEMS_PER_PAGE,
    resetKey: tripStatusFilter,
  });

  if (historyLoading) {
    return (
      <div className={`${styles.RentalDashboard} page`}>
        <p>Loading history...</p>
      </div>
    );
  }

  const completedCount = myTrips.filter(
    /* Tests whether each collection entry belongs in the filtered result.
     * It accepts t and returns a boolean. */
    (t) => t.rentalStatus === "completed",
  ).length;
  const approvedCount = myTrips.filter(
    /* Tests whether each collection entry belongs in the filtered result.
     * It accepts t and returns a boolean. */
    (t) => t.rentalStatus === "approved",
  ).length;
  const rejectedCount = myTrips.filter(
    /* Tests whether each collection entry belongs in the filtered result.
     * It accepts trip and returns a boolean. */
    (trip) =>
      matchesTripStatus(trip, "rejected"),
  ).length;
  const cancelledCount = myTrips.filter(
    /* Tests whether each collection entry belongs in the filtered result.
     * It accepts t and returns a boolean. */
    (t) => t.rentalStatus === "cancelled",
  ).length;

  const selectedTripStatusLabel =
    tripStatusFilter === "all"
      ? "All statuses"
      : `${tripStatusFilter.charAt(0).toUpperCase()}${tripStatusFilter.slice(1)}`;

  /* Applies the selected trip-status filter and resets pagination.
   * It accepts a select event and returns undefined. */
  const handleTripStatusChange = (event) => {
    setTripStatusFilter(event.target.value);
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
            {displayedPayments.map(
              /* Transforms each collection entry for the surrounding mapping.
               * It accepts rental and returns the mapped value. */
              (rental) => {
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
                          <Calendar size={14} /> {formatShortDate(rental.startDate)} -{" "}
                          {formatShortDate(rental.endDate)}
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
                          onClick={
                            /* Handles the click callback for this rendered control.
                             * It accepts no arguments and returns the delegated result. */
                            () =>
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
                          onClick={
                            /* Handles the click callback for this rendered control.
                             * It accepts no arguments and returns the delegated result. */
                            () => handleViewDetails(rental)}
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
                currentPage={paymentPage}
                totalPages={totalPaymentPages}
                handlePrevPage={previousPaymentPage}
                handleNextPage={nextPaymentPage}
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
            {displayedApprovals.map(
              /* Transforms each collection entry for the surrounding mapping.
               * It accepts rental and returns the mapped value. */
              (rental) => {
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
                          <Calendar size={14} /> {formatShortDate(rental.startDate)} -{" "}
                          {formatShortDate(rental.endDate)}
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
                          onClick={
                            /* Handles the click callback for this rendered control.
                             * It accepts no arguments and returns the delegated result. */
                            () => handleViewDetails(rental)}
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
                currentPage={approvalPage}
                totalPages={totalApprovalPages}
                handlePrevPage={previousApprovalPage}
                handleNextPage={nextApprovalPage}
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
            {displayedPending.map(
              /* Transforms each collection entry for the surrounding mapping.
               * It accepts group and returns the mapped value. */
              (group) => {
                const { vehicleInfo, rentals } = group;

                return (
                  <div key={vehicleInfo.licensePlate} className={styles.card}>
                    <div
                      className={styles.imageWrapper}
                      onClick={
                        /* Handles the click callback for this rendered control.
                         * It accepts no arguments and returns the delegated result. */
                        () => handleViewDetails(vehicleInfo)}
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
                        onClick={
                          /* Handles the click callback for this rendered control.
                           * It accepts no arguments and returns the delegated result. */
                          () => handleViewDetails(vehicleInfo)}
                      >
                        Vehicle Details
                      </button>

                      <button
                        className={styles.openModalBtn}
                        onClick={
                          /* Handles the click callback for this rendered control.
                           * It accepts no arguments and returns the delegated result. */
                          () => openModal(group, "pending")}
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
                handlePrevPage={previousPendingPage}
                handleNextPage={nextPendingPage}
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
              {displayedTrips.map(
                /* Transforms each collection entry for the surrounding mapping.
                 * It accepts group and returns the mapped value. */
                (group) => {
                  const { vehicleInfo, rentals } = group;
                  const matchingTrips =
                    tripStatusFilter === "all"
                      ? rentals.length
                      : rentals.filter(
                          /* Tests whether each collection entry belongs in the filtered result.
                           * It accepts rental and returns a boolean. */
                          (rental) =>
                            matchesTripStatus(rental, tripStatusFilter),
                        ).length;

                  return (
                    <div key={vehicleInfo.licensePlate} className={styles.card}>
                      <div
                        className={styles.imageWrapper}
                        onClick={
                          /* Handles the click callback for this rendered control.
                           * It accepts no arguments and returns the delegated result. */
                          () => handleViewDetails(vehicleInfo)}
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
                          onClick={
                            /* Handles the click callback for this rendered control.
                             * It accepts no arguments and returns the delegated result. */
                            () => handleViewDetails(vehicleInfo)}
                        >
                          Vehicle Details
                        </button>

                        <button
                          className={styles.openModalBtn}
                          onClick={
                            /* Handles the click callback for this rendered control.
                             * It accepts no arguments and returns the delegated result. */
                            () => openModal(group, "trips")}
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
                  handlePrevPage={previousTripsPage}
                  handleNextPage={nextTripsPage}
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
