// Defines the Government Verification Controls React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import { useState } from "react";
import { RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import AsyncButton from "../AsyncButton/AsyncButton";
import { useDocumentContext } from "../../context/DocumentContext";
import { formatGovCheckStatus } from "../../utils/displayFormat";
import styles from "./GovernmentVerificationControls.module.css";

const MIN_OVERRIDE_REASON_LENGTH = 10;
const MAX_OVERRIDE_REASON_LENGTH = 500;

// Renders the Government Verification Controls interface.
// Accepts an options object and returns rendered JSX.
const GovernmentVerificationControls = ({
  licensePlate,
  governmentStatus,
  onUpdated,
}) => {
  const {
    runVehicleGovernmentCheck,
    manuallyVerifyVehicleGovernmentCheck,
  } = useDocumentContext();
  const [isChecking, setIsChecking] = useState(false);
  const [isOverriding, setIsOverriding] = useState(false);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState(null);

  const busy = isChecking || isOverriding;
  const isFirstCheck =
    !governmentStatus ||
    governmentStatus === "not_checked" ||
    governmentStatus === "pending";

  // Reloads the current vehicle so verification details reflect the latest API state.
  // Takes no arguments and returns a promise for the refresh operation.
  const refreshVehicle = async () => {
    try {
      await onUpdated?.();
    } catch {
      // The action itself succeeded. A normal page refresh can recover if the
      // follow-up vehicle request happens to fail.
    }
  };

  // Handles official check for the surrounding interface.
  // Takes no arguments and returns a promise for the operation result.
  const handleOfficialCheck = async () => {
    if (busy) return;
    setFeedback(null);
    setIsChecking(true);
    const result = await runVehicleGovernmentCheck(licensePlate);
    setIsChecking(false);

    if (!result.ok) {
      setFeedback({ type: "error", message: result.message });
      return;
    }

    const nextStatus = result.governmentCheck?.status || "error";
    if (nextStatus === "verified") {
      setFeedback({
        type: "success",
        message: "Official government verification succeeded.",
      });
    } else {
      setFeedback({
        type: "warning",
        message: `Official lookup result: ${formatGovCheckStatus(nextStatus)}. You can retry or use a documented manual override.`,
      });
    }
    await refreshVehicle();
  };

  // Handles manual override for the surrounding interface.
  // Accepts event and returns a promise for the operation result.
  const handleManualOverride = async (event) => {
    event.preventDefault();
    if (busy) return;

    const cleanReason = reason.trim();
    if (cleanReason.length < MIN_OVERRIDE_REASON_LENGTH) {
      setFeedback({
        type: "error",
        message: `Enter at least ${MIN_OVERRIDE_REASON_LENGTH} characters explaining the override.`,
      });
      return;
    }

    setFeedback(null);
    setIsOverriding(true);
    const result = await manuallyVerifyVehicleGovernmentCheck(
      licensePlate,
      cleanReason,
    );
    setIsOverriding(false);

    if (!result.ok) {
      setFeedback({ type: "error", message: result.message });
      return;
    }

    setFeedback({
      type: "success",
      message: result.message || "Vehicle manually verified.",
    });
    setIsOverrideOpen(false);
    setReason("");
    await refreshVehicle();
  };

  return (
    <div className={styles.GovernmentVerificationControls}>
      <p className={styles.adminOnlyNote}>
        Admin tools: try the official lookup first. Use a manual override only
        after independently checking the vehicle.
      </p>

      <div className={styles.actions}>
        <AsyncButton
          type="button"
          className={styles.officialButton}
          onClick={handleOfficialCheck}
          loading={isChecking}
          loadingText="Checking..."
          disabled={isOverriding}
        >
          <RefreshCw size={15} aria-hidden="true" />
          {isFirstCheck ? "Run official check" : "Retry official check"}
        </AsyncButton>
        <button
          type="button"
          className={styles.overrideButton}
          onClick={
            // Handles the component's click event.
            // Takes no arguments and returns the handler result.
            () => {
              setIsOverrideOpen(
                // Handles the component's click event.
                // Accepts open and returns the handler result.
                (open) => !open);
              setFeedback(null);
            }}
          disabled={busy}
          aria-expanded={isOverrideOpen}
        >
          <ShieldCheck size={15} aria-hidden="true" />
          Manually verify
        </button>
      </div>

      {isOverrideOpen && (
        <form className={styles.overrideForm} onSubmit={handleManualOverride}>
          <div className={styles.overrideWarning}>
            <TriangleAlert size={17} aria-hidden="true" />
            <p>
              This bypasses the official comparison and may make the vehicle
              visible to renters. The reason and your admin account will be
              recorded.
            </p>
          </div>
          <label htmlFor={`manual-government-reason-${licensePlate}`}>
            Override reason <span>(required)</span>
          </label>
          <textarea
            id={`manual-government-reason-${licensePlate}`}
            value={reason}
            onChange={
              // Handles the component's change event.
              // Accepts event and returns the handler result.
              (event) => setReason(event.target.value)}
            minLength={MIN_OVERRIDE_REASON_LENGTH}
            maxLength={MAX_OVERRIDE_REASON_LENGTH}
            rows={3}
            placeholder="Explain what evidence you checked and why the official result cannot be used."
            disabled={busy}
            required
          />
          <div className={styles.formFooter}>
            <span className={styles.counter}>
              {reason.length}/{MAX_OVERRIDE_REASON_LENGTH}
            </span>
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={
                  // Handles the component's click event.
                  // Takes no arguments and returns the handler result.
                  () => {
                    setIsOverrideOpen(false);
                    setReason("");
                    setFeedback(null);
                  }}
                disabled={busy}
              >
                Cancel
              </button>
              <AsyncButton
                type="submit"
                className={styles.confirmButton}
                loading={isOverriding}
                loadingText="Verifying..."
                disabled={isChecking}
              >
                Confirm manual verification
              </AsyncButton>
            </div>
          </div>
        </form>
      )}

      {feedback && (
        <p
          className={`${styles.feedback} ${styles[feedback.type]}`}
          role={feedback.type === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
};

export default GovernmentVerificationControls;
