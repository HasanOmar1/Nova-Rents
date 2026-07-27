// Formats internal chart period keys ("2026-07-28", "2026-W27", "2026-07")
// into human-readable labels. All date math uses local-time Date constructors —
// never toISOString() or Date("YYYY-MM-DD") parsing, which are UTC-based and can
// shift the displayed day in Israel / other non-UTC timezones.

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEK_KEY = /^(\d{4})-W(\d{1,2})$/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;

// Monday of the given ISO week. Week 1 contains January 4.
const getIsoWeekStart = (isoYear, isoWeek) => {
  const jan4 = new Date(isoYear, 0, 4);
  const isoWeekday = jan4.getDay() === 0 ? 7 : jan4.getDay(); // Mon=1..Sun=7
  const monday = new Date(isoYear, 0, 4 - (isoWeekday - 1));
  monday.setDate(monday.getDate() + (isoWeek - 1) * 7);
  return monday;
};

// "Jul 6–12" within one month, "Jun 29–Jul 5" across months
const formatIsoWeekRange = (isoYear, isoWeek) => {
  const start = getIsoWeekStart(isoYear, isoWeek);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startLabel = `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()}`;
  const endLabel =
    start.getMonth() === end.getMonth()
      ? `${end.getDate()}`
      : `${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}`;

  return { range: `${startLabel}\u2013${endLabel}`, year: end.getFullYear() };
};

// Short X-axis tick: "Jul 28" / "Jul 6–12" / "Jul 2026"
export const formatPeriodTick = (periodKey) => {
  const key = String(periodKey);

  const dayMatch = key.match(DAY_KEY);
  if (dayMatch) {
    return `${MONTHS_SHORT[Number(dayMatch[2]) - 1]} ${Number(dayMatch[3])}`;
  }

  const weekMatch = key.match(WEEK_KEY);
  if (weekMatch) {
    return formatIsoWeekRange(Number(weekMatch[1]), Number(weekMatch[2])).range;
  }

  const monthMatch = key.match(MONTH_KEY);
  if (monthMatch) {
    return `${MONTHS_SHORT[Number(monthMatch[2]) - 1]} ${monthMatch[1]}`;
  }

  return key;
};

// Longer tooltip heading: "July 28, 2026" / "Jul 6–12, 2026" / "July 2026"
export const formatPeriodTooltip = (periodKey) => {
  const key = String(periodKey);

  const dayMatch = key.match(DAY_KEY);
  if (dayMatch) {
    return `${MONTHS_LONG[Number(dayMatch[2]) - 1]} ${Number(dayMatch[3])}, ${dayMatch[1]}`;
  }

  const weekMatch = key.match(WEEK_KEY);
  if (weekMatch) {
    const { range, year } = formatIsoWeekRange(
      Number(weekMatch[1]),
      Number(weekMatch[2]),
    );
    return `${range}, ${year}`;
  }

  const monthMatch = key.match(MONTH_KEY);
  if (monthMatch) {
    return `${MONTHS_LONG[Number(monthMatch[2]) - 1]} ${monthMatch[1]}`;
  }

  return key;
};
