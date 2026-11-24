// Provides document-expiry and completion helpers for the vehicle document cards.
// Its exports summarize records and generate stable accordion identifiers.

// Tests whether a supplied date falls before the current time.
// Accepts a date-like value and returns a Boolean.
export const isPastDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
};

// Counts completed and total slots in a vehicle's document collection.
// Accepts document records and returns completion-count summary fields.
export const getVehicleDocSummary = (documents = []) => {
  const verifiedCount = documents.filter(
    // Tests whether one collection entry belongs in the filtered result.
    // Accepts slot and returns a Boolean inclusion result.
    (slot) => slot.status === "verified",
  ).length;

  return {
    verifiedCount,
    total: documents.length || 2,
    hasPending: documents.some(
      // Tests one collection entry for the surrounding existence check.
      // Accepts slot and returns a Boolean match result.
      (slot) => slot.status === "pending_review"),
    needsDocuments: documents.some(
      // Tests one collection entry for the surrounding existence check.
      // Accepts slot and returns a Boolean match result.
      (slot) => !slot.status || slot.status === "not_uploaded",
    ),
    fullyVerified:
      documents.length >= 2 &&
      documents.every(
        // Tests one collection entry for the surrounding all-items check.
        // Accepts slot and returns a Boolean validity result.
        (slot) => slot.status === "verified"),
  };
};

// Builds the DOM identifier used by a vehicle document accordion panel.
// Accepts a license plate and returns a sanitized ID string.
export const getVehicleDocumentsId = (licensePlate) =>
  `vehicle-documents-${encodeURIComponent(String(licensePlate))}`;
