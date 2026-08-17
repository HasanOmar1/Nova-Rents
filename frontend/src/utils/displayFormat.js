/** Formats project currency values with a dollar prefix and locale separators. */
export const formatCurrency = (value) =>
  `$${(Number(value) || 0).toLocaleString()}`;

/** Converts an event key such as "vehicle_created" to "Vehicle Created". */
export const formatEventLabel = (eventName, customLabels = {}) => {
  if (customLabels[eventName]) return customLabels[eventName];

  return String(eventName || "")
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
};

const COMPLAINT_STATUS_LABELS = {
  open: "Open",
  in_review: "In review",
  resolved: "Resolved",
  closed: "Closed",
};

export const formatComplaintStatus = (status, fallback = "Unknown") =>
  COMPLAINT_STATUS_LABELS[status] || status || fallback;
