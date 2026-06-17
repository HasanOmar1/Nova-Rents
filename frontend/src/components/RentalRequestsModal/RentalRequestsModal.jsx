import { useEffect, useRef, useState } from "react";
import styles from "./RentalRequestsModal.module.css";
import { X, Calendar, CheckCircle, XCircle } from "lucide-react";

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const RentalRequestsModal = ({
  isOpen,
  onClose,
  groupData,
  mode,
  respondToRequest,
}) => {
  const dialogRef = useRef(null);
  const [tripFilter, setTripFilter] = useState("all");

  useEffect(() => {
    if (isOpen) {
      setTripFilter("all");
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && groupData) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialog.close();
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen, groupData]);

  useEffect(() => {
    if (isOpen && groupData && groupData.rentals.length === 0) {
      onClose();
    }
  }, [groupData, isOpen, onClose]);

  if (!groupData) return null;

  const { vehicleInfo, rentals } = groupData;
  const isPendingMode = mode === "pending";

  const filteredRentals = isPendingMode
    ? rentals
    : rentals.filter((trip) => {
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
      onClick={(e) => e.stopPropagation()}
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
              onChange={(e) => setTripFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Trips</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
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
          filteredRentals.map((rental) => (
            <div key={rental.rentalId} className={styles.rentalItem}>
              <div className={styles.itemHeader}>
                <p className={styles.renterName}>
                  {isPendingMode ? "Requested by:" : "Rented by:"}{" "}
                  <strong>
                    {rental.renterFirstName} {rental.renterLastName}
                  </strong>
                </p>
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
                  <Calendar size={14} /> {formatDate(rental.startDate)} -{" "}
                  {formatDate(rental.endDate)}
                </p>
                <p className={styles.price}>Total: ${rental.totalPrice}</p>
              </div>

              {isPendingMode && (
                <div className={styles.actionBtns}>
                  <button
                    className={styles.approveBtn}
                    onClick={() => respondToRequest(rental.rentalId, "approve")}
                  >
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button
                    className={styles.declineBtn}
                    onClick={() => respondToRequest(rental.rentalId, "reject")}
                  >
                    <XCircle size={16} /> Decline
                  </button>
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
