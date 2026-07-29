import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./Payment.module.css";
import { useRentContext } from "../../../context/RentContext";
import { parseImgs } from "../../../utils/parseImgs";
import {
  Car,
  Calendar,
  CreditCard,
  CheckCircle,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";

const formatDate = (dateStr) => {
  if (!dateStr) return "Unknown date";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatAmount = (amount, currency) => {
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount)) return `${amount} ${currency || ""}`;
  const prefix = currency === "USD" ? "$" : `${currency} `;
  return `${prefix}${numericAmount.toFixed(2)}`;
};

const Payment = () => {
  const { paymentToken } = useParams();
  const navigate = useNavigate();
  const { getPaymentByToken, payByToken } = useRentContext();

  const [payment, setPayment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [justPaid, setJustPaid] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadPayment = async () => {
      setIsLoading(true);
      const result = await getPaymentByToken(paymentToken);
      if (cancelled) return;
      setPayment(result);
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
          <h2>Payment not found</h2>
          <p>
            This payment link is invalid, expired, or belongs to another
            account.
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
              <Calendar size={14} /> {formatDate(payment.startDate)} -{" "}
              {formatDate(payment.endDate)}
            </p>
            {ownerName && <p>Vehicle owner: {ownerName}</p>}
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
                  Paid on {formatDate(payment.paidAt)}
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
