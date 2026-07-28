// Shared time-bucketing policy for report/analytics endpoints.
// Ranges up to DAILY_BUCKET_LIMIT_DAYS are grouped by day, up to
// WEEKLY_BUCKET_LIMIT_DAYS by week, anything longer by month.
const DAILY_BUCKET_LIMIT_DAYS = 31;
const WEEKLY_BUCKET_LIMIT_DAYS = 180;

// Parse "YYYY-MM-DD" using local date parts — new Date("YYYY-MM-DD") is
// UTC-based and can shift the local day, which would misalign bucket keys.
function parseLocalDate(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const parsed = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Granularity + matching MySQL DATE_FORMAT pattern for a parsed range.
function resolveGranularity(start, end) {
  const rangeInDays = (end - start) / (1000 * 60 * 60 * 24);

  if (rangeInDays <= DAILY_BUCKET_LIMIT_DAYS) {
    return { granularity: "day", dateFormat: "%Y-%m-%d" };
  }
  if (rangeInDays <= WEEKLY_BUCKET_LIMIT_DAYS) {
    return { granularity: "week", dateFormat: "%x-W%v" };
  }
  return { granularity: "month", dateFormat: "%Y-%m" };
}

// ISO week key ("2026-W27") for a local date, matching MySQL's "%x-W%v".
// The Thursday of a date's week always falls inside its ISO year/week.
function getIsoWeekKey(date) {
  const thursday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  thursday.setDate(thursday.getDate() - ((thursday.getDay() + 6) % 7) + 3);

  const isoYear = thursday.getFullYear();
  const jan4 = new Date(isoYear, 0, 4);
  const week1Thursday = new Date(isoYear, 0, 4 - ((jan4.getDay() + 6) % 7) + 3);
  const week = 1 + Math.round((thursday - week1Thursday) / (7 * 86400000));

  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

// Ordered, de-duplicated period keys covering [start, end] so chart buckets
// with no rows can be zero-filled instead of disappearing.
function buildPeriodKeys(start, end, granularity) {
  const keys = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  while (cursor <= end) {
    let key;
    if (granularity === "day") {
      const month = String(cursor.getMonth() + 1).padStart(2, "0");
      const day = String(cursor.getDate()).padStart(2, "0");
      key = `${cursor.getFullYear()}-${month}-${day}`;
    } else if (granularity === "week") {
      key = getIsoWeekKey(cursor);
    } else {
      key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    }
    if (keys[keys.length - 1] !== key) keys.push(key);
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

module.exports = {
  DAILY_BUCKET_LIMIT_DAYS,
  WEEKLY_BUCKET_LIMIT_DAYS,
  parseLocalDate,
  resolveGranularity,
  buildPeriodKeys,
};
