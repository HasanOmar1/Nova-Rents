// Provides local-time date parsing, validation, masking, and display formatting.
// Its helpers exchange ISO input values and user-facing date strings safely.

// Tests whether a value is a valid JavaScript Date instance.
// Accepts a candidate value and returns a Boolean validity result.
const isValidDate = (date) =>
  date instanceof Date && !Number.isNaN(date.getTime());

/**
 * Formats a Date or date-like value for an HTML date input using local time.
 * Using local fields avoids the day shift that can happen with toISOString().
 */

// Formats date for input for display.
// Accepts value and returns the computed result.
export const formatDateForInput = (value) => {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/** Converts API YYYY-MM-DD (or Date) to DD/MM/YYYY for display/typing. */

// Formats iso date to display for display.
// Accepts value and returns the computed result.
export const formatIsoDateToDisplay = (value) => {
  if (!value) return "";
  const iso = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
};

// Determines whether real calendar date applies.
// Accepts year, month, and day and returns the computed result.
const isRealCalendarDate = (year, month, day) => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

/**
 * Parses a typed DD/MM/YYYY string into YYYY-MM-DD.
 * Rejects incomplete and impossible dates without overflowing (e.g. 31/02/2028).
 */

// Parses display date to iso into the required application shape.
// Accepts value and returns the computed result.
export const parseDisplayDateToIso = (value) => {
  const text = String(value || "").trim();
  if (!text) {
    return { ok: true, iso: "", complete: false };
  }

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) {
    return { ok: false, iso: "", complete: text.length >= 10 };
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!isRealCalendarDate(year, month, day)) {
    return { ok: false, iso: "", complete: true };
  }

  return {
    ok: true,
    complete: true,
    iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
};

/** Keeps typed date input as digits with optional slashes, max DD/MM/YYYY. */

// Restricts typed date content to the DD/MM/YYYY shape during editing.
// Accepts raw text and insertion options and returns the masked display string.
export const maskDisplayDateInput = (raw, { inserting = true } = {}) => {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 8);
  if (!inserting) {
    return String(raw || "")
      .replace(/[^\d/]/g, "")
      .slice(0, 10);
  }
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

export const DISPLAY_DATE_ERROR = "Enter a valid date in DD/MM/YYYY format.";

/** Returns an inclusive recent-month range ending today. */

// Creates recent month range for the current workflow.
// Accepts month count and today and returns the computed result.
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

// Formats short date for display.
// Accepts value and fallback and returns the computed result.
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
