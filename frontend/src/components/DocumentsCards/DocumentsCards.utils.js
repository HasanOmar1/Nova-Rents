export const isPastDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
};

export const getVehicleDocSummary = (documents = []) => {
  const verifiedCount = documents.filter(
    (slot) => slot.status === "verified",
  ).length;

  return {
    verifiedCount,
    total: documents.length || 2,
    hasPending: documents.some((slot) => slot.status === "pending_review"),
    needsDocuments: documents.some(
      (slot) => !slot.status || slot.status === "not_uploaded",
    ),
    fullyVerified:
      documents.length >= 2 &&
      documents.every((slot) => slot.status === "verified"),
  };
};

export const getVehicleDocumentsId = (licensePlate) =>
  `vehicle-documents-${encodeURIComponent(String(licensePlate))}`;
