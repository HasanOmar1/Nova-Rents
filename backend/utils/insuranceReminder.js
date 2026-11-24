/** Shared backend utility for insurance reminder operations.
 * Normalizes, validates, or transforms values for the surrounding domain. */
/** Formats license plate display.
 * Accepts licensePlate; returns the derived value. */
function formatLicensePlateDisplay(licensePlate) {
  const digits = String(licensePlate ?? "").replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  if (digits.length === 7) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return digits || String(licensePlate ?? "");
}

/** Builds vehicle label.
 * Accepts row; returns the derived value. */
function buildVehicleLabel(row) {
  const plate = formatLicensePlateDisplay(row.licensePlate);
  const name = [row.brandName, row.modelName].filter(Boolean).join(" ").trim();
  if (name && row.year) return `${name} ${row.year} (${plate})`;
  if (name) return `${name} (${plate})`;
  return `vehicle ${plate}`;
}

/** Builds insurance reminder copy.
 * Accepts stage and vehicleLabel; returns the derived value. */
function buildInsuranceReminderCopy(stage, vehicleLabel) {
  if (stage === "7d") {
    return {
      title: "Insurance Expiring Soon",
      notification: `Your insurance for ${vehicleLabel} expires in 7 days. Please upload renewed insurance before it expires.`,
      emailSubject: `Insurance expiring in 7 days — ${vehicleLabel}`,
      emailIntro: `Your insurance for ${vehicleLabel} expires in 7 days.`,
      emailAction:
        "Please upload renewed insurance before it expires to keep your vehicle documents current.",
    };
  }
  if (stage === "1d") {
    return {
      title: "Insurance Expires Tomorrow",
      notification: `Your insurance for ${vehicleLabel} expires tomorrow.`,
      emailSubject: `Insurance expires tomorrow — ${vehicleLabel}`,
      emailIntro: `Your insurance for ${vehicleLabel} expires tomorrow.`,
      emailAction:
        "Please upload valid renewed insurance as soon as possible.",
    };
  }
  return {
    title: "Insurance Expired",
    notification: `Your insurance for ${vehicleLabel} has expired. Please upload valid insurance.`,
    emailSubject: `Insurance expired — ${vehicleLabel}`,
    emailIntro: `Your insurance for ${vehicleLabel} has expired.`,
    emailAction: "Please upload valid insurance to restore your document status.",
  };
}

module.exports = {
  formatLicensePlateDisplay,
  buildVehicleLabel,
  buildInsuranceReminderCopy,
};
