import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./Payment.module.css";
import { useRentContext } from "../../../context/RentContext";
import { parseImgs } from "../../../utils/parseImgs";
import { formatShortDate } from "../../../utils/dateFormat";
import {
  Car,
  Calendar,
  CreditCard,
  CheckCircle,
  ShieldAlert,
  ArrowLeft,
  MapPin,
} from "lucide-react";

const formatAmount = (amount, currency) => {
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount)) return `${amount} ${currency || ""}`;
  const prefix = currency === "USD" ? "$" : `${currency} `;
  return `${prefix}${numericAmount.toFixed(2)}`;
};

const paymentLoadErrorCopy = (status, backendMessage) => {
  if (status === 401) {
    return {
      title: "Sign in required",
      message: "Please sign in to access this payment.",
    };
  }
  if (status === 403) {
    return {
      title: "Wrong account",
      message: "This payment belongs to another account.",
    };
  }
  if (status === 404 || status === 400) {
    return {
      title: "Payment not found",
      message: "Payment link not found or invalid.",
    };
  }
  if (status === 409) {
    return {
      title: "Payment unavailable",
      message: backendMessage || "This payment cannot be processed right now.",
    };
  }
  return {
    title: "Payment error",
    message: "Payment details could not be loaded.",
  };
};

const Payment = () => {
  const { paymentToken } = useParams();
  const navigate = useNavigate();
  const { getPaymentByToken, payByToken } = useRentContext();

  const [payment, setPayment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadError, setLoadError] = useState(null);
  const [justPaid, setJustPaid] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadPayment = async () => {
      setIsLoading(true);
      setLoadError(null);
      const result = await getPaymentByToken(paymentToken);
      if (cancelled) return;
      if (result.ok && result.payment) {
        setPayment(result.payment);
        setLoadError(null);
      } else {
        setPayment(null);
        setLoadError(
          paymentLoadErrorCopy(result.status, result.message),
        );
      }
      setIsLoading(false);
    };

    loadPayment();
    return () => {
      cancelled = true;
    };
  }, [paymentToken]);

  const handlePay = async () => {
    if (isPaying) return;
    setIsPaying(true);
    setErrorMsg("");

    const result = await payByToken(paymentToken);

    if (result.success) {
      setPayment(result.payment);
      setJustPaid(true);
    } else {
      setErrorMsg(result.message);
    }
    setIsPaying(false);
  };

  if (isLoading) {
    return (
      <div className={`${styles.Payment} page`}>
        <p className={styles.loadingMsg}>Loading payment...</p>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className={`${styles.Payment} page`}>
        <div className={styles.notFoundCard}>
          <ShieldAlert size={40} color="#f87171" />
          <h2>{loadError?.title || "Payment not found"}</h2>
          <p>
            {loadError?.message ||
              "This payment link is invalid, expired, or belongs to another account."}
          </p>
          <button
            className={styles.backBtn}
            onClick={() => navigate("/rentalDashboard")}
          >
            <ArrowLeft size={16} /> Back to Rental Dashboard
          </button>
        </div>
      </div>
    );
  }

  const vehicleName = `${payment.brandName || ""} ${payment.modelName || ""}`.trim();
  const ownerName =
    `${payment.ownerFirstName || ""} ${payment.ownerLastName || ""}`.trim();
  const isPaid = payment.paymentStatus === "paid";
  const isPayable =
    payment.paymentStatus === "pending" && payment.rentalStatus === "approved";
  const showExactPickup = isPaid && payment.exactPickupAvailable;

  return (
    <div className={`${styles.Payment} page`}>
      <div className={styles.header}>
        <h1>
          <CreditCard size={26} /> Test Payment
        </h1>
        <p>Confirm your booking by completing this test payment.</p>
      </div>

      <div className={styles.card}>
        <div className={styles.vehicleSection}>
          {payment.image && (
            <img
              src={parseImgs(payment.image)}
              alt={vehicleName || "Vehicle"}
              className={styles.vehicleImage}
            />
          )}
          <div className={styles.vehicleMeta}>
            <h2>{vehicleName || "Unknown vehicle"}</h2>
            <p>
              <Car size={14} /> Plate: {payment.licensePlate}
            </p>
            <p>
              <Calendar size={14} /> {formatShortDate(payment.startDate)} -{" "}
              {formatShortDate(payment.endDate)}
            </p>
            {ownerName && <p>Vehicle owner: {ownerName}</p>}
            {payment.vehicleAddress && (
              <p>
                <MapPin size={14} /> City: {payment.vehicleAddress}
              </p>
            )}
          </div>
        </div>

        <div className={styles.amountRow}>
          <span>Total amount</span>
          <strong>{formatAmount(payment.amount, payment.currency)}</strong>
        </div>

        <div className={styles.disclaimer}>
          <ShieldAlert size={16} />
          <span>This is a Test payment. No real money will be charged.</span>
        </div>

        {showExactPickup ? (
          <div className={styles.pickupBox}>
            <h3>
              <MapPin size={16} /> Exact pickup location
            </h3>
            <p className={styles.pickupAddress}>{payment.pickupAddress}</p>
            {payment.pickupInstructions && (
              <p className={styles.pickupInstructions}>
                {payment.pickupInstructions}
              </p>
            )}
            {payment.mapsDirectionsUrl && (
              <a
                className={styles.directionsBtn}
                href={payment.mapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Directions
              </a>
            )}
          </div>
        ) : (
          !isPaid && (
            <p className={styles.pickupHint}>
              Exact pickup details will be available after payment.
            </p>
          )
        )}

        {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}

        {isPaid ? (
          <div className={styles.paidBox}>
            <CheckCircle size={22} color="#4ade80" />
            <div>
              <p className={styles.paidTitle}>
                {justPaid
                  ? "Test payment completed successfully!"
                  : "This Test payment was already completed."}
              </p>
              {payment.paidAt && (
                <p className={styles.paidDate}>
                  Paid on {formatShortDate(payment.paidAt)}
                </p>
              )}
            </div>
          </div>
        ) : isPayable ? (
          <button
            className={styles.payBtn}
            onClick={handlePay}
            disabled={isPaying}
          >
            {isPaying
              ? "Processing..."
              : `Pay ${formatAmount(payment.amount, payment.currency)} (Test)`}
          </button>
        ) : (
          <p className={styles.unavailableMsg}>
            This payment can no longer be completed (payment status:{" "}
            {payment.paymentStatus}, rental status: {payment.rentalStatus}).
          </p>
        )}

        <button
          className={styles.backBtn}
          onClick={() => navigate("/rentalDashboard")}
        >
          <ArrowLeft size={16} /> Back to Rental Dashboard
        </button>
      </div>
    </div>
  );
};

export default Payment;
