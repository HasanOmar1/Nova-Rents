const isValidDate = (date) =>
  date instanceof Date && !Number.isNaN(date.getTime());

/**
 * Formats a Date or date-like value for an HTML date input using local time.
 * Using local fields avoids the day shift that can happen with toISOString().
 */
export const formatDateForInput = (value) => {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/** Returns an inclusive recent-month range ending today. */
export const createRecentMonthRange = (
  monthCount = 6,
  today = new Date(),
) => {
  const firstMonth = new Date(
    today.getFullYear(),
    today.getMonth() - (monthCount - 1),
    1,
  );

  return {
    from: formatDateForInput(firstMonth),
    to: formatDateForInput(today),
  };
};

/** Formats a date as "17 Aug 2026" using the project's rental-date style. */
export const formatShortDate = (value, fallback = "Unknown date") => {
  if (!value) return fallback;

  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) return fallback;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
