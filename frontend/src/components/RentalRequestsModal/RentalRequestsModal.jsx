// Defines the Rental Requests Modal React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./RentalRequestsModal.module.css";
import {
  X,
  Calendar,
  CheckCircle,
  XCircle,
  ExternalLink,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import AsyncButton from "../AsyncButton/AsyncButton";
import { formatShortDate } from "../../utils/dateFormat";
import { useModalDialog } from "../../hooks/useModalDialog";

// Renders the Rental Requests Modal interface.
// Accepts an options object and returns rendered JSX.
const RentalRequestsModal = ({
  isOpen,
  onClose,
  groupData,
  mode,
  initialTripFilter = "all",
  respondToRequest,
}) => {
  const dialogRef = useModalDialog(isOpen && Boolean(groupData));
  const [tripFilter, setTripFilter] = useState("all");
  const [reportMenuRentalId, setReportMenuRentalId] = useState(null);
  const [pendingAction, setPendingAction] = useState("");
  const navigate = useNavigate();

  // Handles rental action for the surrounding interface.
  // Accepts rental id and action and returns a promise for the operation result.
  const handleRentalAction = async (rentalId, action) => {
    const actionKey = `${action}-${rentalId}`;
    setPendingAction(actionKey);
    try {
      await respondToRequest(rentalId, action);
    } finally {
      setPendingAction("");
    }
  };

  useEffect(
    // Synchronizes the component with an external effect after rendering.
    // Takes no arguments and returns an optional cleanup function.
    () => {
      if (isOpen) {
        setTripFilter(mode === "pending" ? "all" : initialTripFilter);
        setReportMenuRentalId(null);
      }
    }, [initialTripFilter, isOpen, mode]);

  useEffect(
    // Synchronizes the component with an external effect after rendering.
    // Takes no arguments and returns an optional cleanup function.
    () => {
      if (isOpen && groupData && groupData.rentals.length === 0) {
        onClose();
      }
    }, [groupData, isOpen, onClose]);

  if (!groupData) return null;

  const { vehicleInfo, rentals } = groupData;
  const isPendingMode = mode === "pending";

  const filteredRentals = isPendingMode
    ? rentals
    : rentals.filter(
      // Tests whether one collection entry belongs in the filtered result.
      // Accepts trip and returns a Boolean inclusion result.
      (trip) => {
        if (tripFilter === "all") return true;
        if (tripFilter === "rejected") {
          return (
            trip.rentalStatus === "rejected" || trip.rentalStatus === "declined"
          );
        }
        return trip.rentalStatus === tripFilter;
      });

  return (
    <dialog
      className={styles.RentalRequestsModal}
      ref={dialogRef}
      onClose={onClose}
      onClick={
        // Handles the component's click event.
        // Accepts e and returns the handler result.
        (e) => e.stopPropagation()}
    >
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2>
            {vehicleInfo.brandName} {vehicleInfo.modelName}
          </h2>
          <p>
            {isPendingMode ? "Pending Requests" : "Rental History"} (Plate:{" "}
            {vehicleInfo.licensePlate})
          </p>
        </div>

        <div className={styles.headerControls}>
          {!isPendingMode && (
            <select
              value={tripFilter}
              onChange={
                // Handles the component's change event.
                // Accepts e and returns the handler result.
                (e) => setTripFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Trips</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
              <option value="approved">Approved</option>
            </select>
          )}
          <button
            className={styles.closeIconBtn}
            onClick={onClose}
            type="button"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className={styles.listContainer}>
        {filteredRentals.length === 0 ? (
          <p className={styles.emptyMsg}>No trips found for this filter.</p>
        ) : (
          filteredRentals.map(
            // Transforms one collection entry for the resulting list.
            // Accepts rental and returns the mapped entry.
            (rental) => (
            <div key={rental.rentalId} className={styles.rentalItem}>
              <div className={styles.itemHeader}>
                {/* --- UPDATED: Renter Name + User Stats Button --- */}
                <div className={styles.renterInfoGroup}>
                  <p className={styles.renterName}>
                    {isPendingMode ? "Requested by:" : "Rented by:"}{" "}
                    <strong>
                      {rental.renterFirstName} {rental.renterLastName}
                    </strong>
                  </p>

                  {isPendingMode && rental.renterEmail && (
                    <button
                      className={styles.viewUserBtn}
                      onClick={
                        // Handles the component's click event.
                        // Takes no arguments and returns the handler result.
                        () =>
                        navigate(`/userStats/${rental.renterEmail}`, {
                          state: rental,
                        })
                      }
                    >
                      <ExternalLink size={14} /> View Profile
                    </button>
                  )}
                </div>

                {!isPendingMode && (
                  <span
                    className={`${styles.statusBadge} ${styles[rental.rentalStatus]}`}
                  >
                    {rental.rentalStatus.charAt(0).toUpperCase() +
                      rental.rentalStatus.slice(1)}
                  </span>
                )}
              </div>

              <div className={styles.detailsList}>
                <p>
                  <Calendar size={14} /> {formatShortDate(rental.startDate)} -{" "}
                  {formatShortDate(rental.endDate)}
                </p>
                <p className={styles.price}>Total: ${rental.totalPrice}</p>
              </div>

              {!isPendingMode && rental.paymentStatus === "paid" && (
                <>
                  <p className={styles.paidLabel}>
                    <CheckCircle size={14} /> Test payment completed
                  </p>
                  {rental.exactPickupAvailable ? (
                    <div className={styles.pickupBox}>
                      <p className={styles.pickupTitle}>
                        <MapPin size={14} /> Exact pickup location
                      </p>
                      <p className={styles.pickupAddress}>
                        {rental.pickupAddress}
                      </p>
                      {rental.pickupInstructions && (
                        <p className={styles.pickupInstructions}>
                          {rental.pickupInstructions}
                        </p>
                      )}
                      {rental.mapsDirectionsUrl && (
                        <a
                          className={styles.directionsBtn}
                          href={rental.mapsDirectionsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Get Directions
                        </a>
                      )}
                    </div>
                  ) : null}

                  {/* Paid trips: report entry → existing /complaints form */}
                  <div className={styles.reportIssueBlock}>
                    {reportMenuRentalId === rental.rentalId ? (
                      <>
                        <p className={styles.reportChoiceLabel}>
                          What would you like to report?
                        </p>
                        <div className={styles.reportChoiceBtns}>
                          <button
                            type="button"
                            className={styles.reportChoiceBtn}
                            onClick={
                              // Handles the component's click event.
                              // Takes no arguments and returns the handler result.
                              () => {
                                onClose();
                                navigate(
                                  `/complaints?complaintType=vehicle` +
                                    `&vehicleLicensePlate=${encodeURIComponent(
                                      rental.licensePlate,
                                    )}` +
                                    `&rentalId=${encodeURIComponent(
                                      rental.rentalId,
                                    )}`,
                                );
                              }}
                          >
                            Vehicle
                          </button>
                          <button
                            type="button"
                            className={styles.reportChoiceBtn}
                            disabled={!rental.ownerId}
                            onClick={
                              // Handles the component's click event.
                              // Takes no arguments and returns the handler result.
                              () => {
                                if (!rental.ownerId) return;
                                onClose();
                                navigate(
                                  `/complaints?complaintType=owner` +
                                    `&ownerId=${encodeURIComponent(
                                      rental.ownerId,
                                    )}` +
                                    `&rentalId=${encodeURIComponent(
                                      rental.rentalId,
                                    )}`,
                                );
                              }}
                          >
                            Owner
                          </button>
                          <button
                            type="button"
                            className={styles.reportCancelBtn}
                            onClick={
                              // Handles the component's click event.
                              // Takes no arguments and returns the handler result.
                              () => setReportMenuRentalId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={styles.reportIssueBtn}
                        onClick={
                          // Handles the component's click event.
                          // Takes no arguments and returns the handler result.
                          () => setReportMenuRentalId(rental.rentalId)}
                      >
                        <AlertTriangle size={16} /> Report an Issue
                      </button>
                    )}
                  </div>
                </>
              )}

              {isPendingMode && (
                <div className={styles.actionBtns}>
                  <AsyncButton
                    className={styles.approveBtn}
                    loading={pendingAction === `approve-${rental.rentalId}`}
                    loadingText="Approving..."
                    disabled={Boolean(pendingAction)}
                    onClick={
                      // Handles the component's click event.
                      // Takes no arguments and returns the handler result.
                      () =>
                      handleRentalAction(rental.rentalId, "approve")
                    }
                  >
                    <CheckCircle size={16} /> Approve
                  </AsyncButton>
                  <AsyncButton
                    className={styles.declineBtn}
                    loading={pendingAction === `reject-${rental.rentalId}`}
                    loadingText="Declining..."
                    disabled={Boolean(pendingAction)}
                    onClick={
                      // Handles the component's click event.
                      // Takes no arguments and returns the handler result.
                      () =>
                      handleRentalAction(rental.rentalId, "reject")
                    }
                  >
                    <XCircle size={16} /> Decline
                  </AsyncButton>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </dialog>
  );
};

export default RentalRequestsModal;
