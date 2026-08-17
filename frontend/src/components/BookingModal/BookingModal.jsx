import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./BookingModal.module.css";
import { useRentContext } from "../../context/RentContext";
import { formatDateForInput } from "../../utils/dateFormat";
import AsyncButton from "../AsyncButton/AsyncButton";
import { useModalDialog } from "../../hooks/useModalDialog";

const BookingModal = ({ isOpen, onClose, vehicle }) => {
  const dialogRef = useModalDialog(isOpen, { lockBodyScroll: true });
  const {
    rentVehicle,
    rentVehResponse,
    bookedRanges,
    fetchBookedDates,
    dateError,
    setDateError,
  } = useRentContext();

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- SMART DATE CALCULATION ---
  // Finds the first available date that isn't inside the bookedRanges
  const findFirstAvailableDate = () => {
    let checkDate = new Date();
    checkDate.setDate(checkDate.getDate() + 1); // Start by checking tomorrow
    checkDate.setHours(0, 0, 0, 0);

    let isAvailable = false;

    while (!isAvailable) {
      const timeToCheck = checkDate.getTime();

      // Look for any overlap
      const collision = bookedRanges.find((range) => {
        const rStart = new Date(range.startDate).setHours(0, 0, 0, 0);
        const rEnd = new Date(range.endDate).setHours(0, 0, 0, 0);
        return timeToCheck >= rStart && timeToCheck <= rEnd;
      });

      if (collision) {
        // If it collides, bump forward 1 day and loop again
        checkDate.setDate(checkDate.getDate() + 1);
      } else {
        // Found a free day!
        isAvailable = true;
      }
    }
    return checkDate;
  };

  // Run the smart date calculation whenever the modal opens or the booked dates change
  useEffect(() => {
    if (isOpen) {
      const firstAvailable = findFirstAvailableDate();

      const nextDay = new Date(firstAvailable);
      nextDay.setDate(nextDay.getDate() + 1);

      setStartDate(firstAvailable);
      setEndDate(nextDay);
      setDateError(""); // Clear old errors
    }
  }, [isOpen, bookedRanges]);

  // Format database dates for react-datepicker
  const excludedIntervals = bookedRanges.map((range) => ({
    start: new Date(range.startDate),
    end: new Date(range.endDate),
  }));

  // Calculate prices
  const dailyRate =
    vehicle.price && typeof vehicle.price === "string"
      ? parseFloat(vehicle.price.split("/")[0])
      : parseFloat(vehicle.price || 0);

  const totalDays =
    startDate && endDate
      ? Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        )
      : 0;
  const totalPrice = totalDays > 0 ? totalDays * dailyRate : 0;

  const handleStartDateChange = (date) => {
    setStartDate(date);
    // Push end date forward if start date passes it
    if (endDate <= date) {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      setEndDate(nextDay);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setDateError("");

    if (totalDays <= 0) {
      setDateError("Rental must be at least 1 day.");
      return;
    }

    const bookingPayload = {
      licensePlate: vehicle.licensePlate,
      startDate: formatDateForInput(startDate),
      endDate: formatDateForInput(endDate),
    };

    setIsSubmitting(true);
    const isSuccess = await rentVehicle(bookingPayload);

    // --- 3. INSTANT RE-FETCH ON SUCCESS ---
    if (isSuccess) {
      await fetchBookedDates(vehicle.licensePlate); // This updates the grayed-out dates immediately!

      // Close the modal shortly after success
      setTimeout(() => {
        onClose();
      }, 500);
    }
    setIsSubmitting(false);
  };

  return (
    <dialog ref={dialogRef} className={styles.BookingModal} onClose={onClose}>
      <div className={styles.header}>
        <h2>Book {vehicle.vehName}</h2>
        <p>Select your preferred rental timelines below.</p>
        <button
          type="button"
          className={styles.closeModalBtn}
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <form onSubmit={handleFormSubmit}>
        {rentVehResponse && (
          <p className={styles.successMsg}>{rentVehResponse}</p>
        )}
        {dateError && <p className={styles.errorMsg}>{dateError}</p>}

        <div className={styles.ownerInfoContainer}>
          <p className={styles.msg}>Rental contract with</p>
          <p>
            {vehicle.ownerFirstName} {vehicle.ownerLastName} —{" "}
            {vehicle.ownerPhone}
          </p>
        </div>

        <div className={styles.allDatesContainer}>
          <div className={styles.datesContainer}>
            <label>Start Date</label>
            <DatePicker
              selected={startDate}
              onChange={handleStartDateChange}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              minDate={new Date(new Date().setDate(new Date().getDate() + 1))} // Absolute min is tomorrow
              excludeDateIntervals={excludedIntervals}
              dateFormat="dd/MM/yyyy"
              className={styles.datePickerInput}
              required
            />
          </div>

          <div className={styles.datesContainer}>
            <label>End Date</label>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={
                startDate
                  ? new Date(startDate.getTime() + 86400000)
                  : new Date()
              } // Min is 1 day after start
              excludeDateIntervals={excludedIntervals}
              dateFormat="dd/MM/yyyy"
              className={styles.datePickerInput}
              required
            />
          </div>
        </div>

        {totalDays > 0 && (
          <div className={styles.priceBreakdown}>
            <div className={styles.priceRow}>
              <p className={styles.label}>
                ${dailyRate} × {totalDays} {totalDays === 1 ? "day" : "days"}
              </p>
              <p className={styles.value}>${totalPrice.toLocaleString()}</p>
            </div>
            <hr className={styles.divider} />
            <div className={`${styles.priceRow} ${styles.totalRow}`}>
              <p>Estimated Total</p>
              <p>${totalPrice.toLocaleString()}</p>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <AsyncButton type="submit" className={styles.submitBtn} loading={isSubmitting} loadingText="Booking...">
            Confirm Booking
          </AsyncButton>
        </div>
      </form>
    </dialog>
  );
};

export default BookingModal;
