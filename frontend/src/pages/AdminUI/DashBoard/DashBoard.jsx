// Presents the admin system-activity dashboard and its chart filters.
// It takes no props and returns activity cards, controls, and chart content.
import styles from "./DashBoard.module.css";
import HomeBottomCards from "../../../components/HomeCards/HomeBottomCards/HomeBottomCards";
import HomeMidCards from "../../../components/HomeCards/HomeMidCards/HomeMidCards";
import { useReportContext } from "../../../context/ReportContext";
import {
  formatPeriodTick,
  formatPeriodTooltip,
} from "../../../utils/periodFormat";
import { formatEventLabel } from "../../../utils/displayFormat";
import { useEffect, useState } from "react";
import { useDateRange } from "../../../hooks/useDateRange";

const CHART_COLORS = [
  "#5494ff",
  "#2ed199",
  "#f6c445",
  "#ff6b6b",
  "#b57bff",
  "#4dd4e8",
  "#ff9f45",
  "#7ee081",
  "#e879b9",
  "#9aa7ff",
  "#38b6a5",
  "#d95f8a",
  "#8ac926",
  "#c98d5c",
  "#6a7bd9",
  "#e0c341",
  "#5cc9b8",
  "#c76fd6",
  "#94b0c2",
  "#f28f6b",
];

// Max series shown by default before the "Show all" toggle kicks in
const TOP_SERIES_LIMIT = 6;

// Loads system activity and renders category-filtered chart series.
// It takes no props and returns the administrative dashboard JSX.
const DashBoard = () => {
  const {
    systemActivityData,
    systemActivitySeries,
    isSystemActivityLoading,
    getSystemActivityChart,
  } = useReportContext();

  const {
    fromDate,
    toDate,
    setFromDate,
    setToDate,
    isRangeValid,
  } = useDateRange();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAllSeries, setShowAllSeries] = useState(false);

  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      if (isRangeValid) {
        getSystemActivityChart(fromDate, toDate);
      }
    }, [fromDate, toDate, isRangeValid]);

  const categories = [
    ...new Set(systemActivitySeries.map(
      /* Transforms each collection entry for the surrounding mapping.
       * It accepts serie and returns the mapped value. */
      (serie) => serie.category)),
  ];

  // Total occurrences per event across the whole period (for top-N ranking)
  const seriesTotals = {};
  for (const serie of systemActivitySeries) {
    seriesTotals[serie.eventName] = systemActivityData.reduce(
      /* Combines the current entry with the running aggregate.
       * It accepts sum and point and returns the next aggregate. */
      (sum, point) => sum + (point[serie.eventName] || 0),
      0,
    );
  }

  const filteredSeries = systemActivitySeries.filter(
    /* Tests whether each collection entry belongs in the filtered result.
     * It accepts serie and returns a boolean. */
    (serie) => categoryFilter === "all" || serie.category === categoryFilter,
  );

  const isSeriesLimited =
    !showAllSeries && filteredSeries.length > TOP_SERIES_LIMIT;

  const visibleSeries = isSeriesLimited
    ? [...filteredSeries]
        .sort(
          /* Orders two collection entries for the surrounding sort.
           * It accepts a and b and returns their numeric ordering. */
          (a, b) => seriesTotals[b.eventName] - seriesTotals[a.eventName])
        .slice(0, TOP_SERIES_LIMIT)
    : filteredSeries;

  const chartSeries = visibleSeries.map(
    /* Transforms each collection entry for the surrounding mapping.
     * It accepts serie and returns the mapped value. */
    (serie) => ({
      dataKey: serie.eventName,
      name: formatEventLabel(serie.eventName),
      color:
        CHART_COLORS[systemActivitySeries.indexOf(serie) % CHART_COLORS.length],
    }));

  return (
    <div className={`${styles.DashBoard} page`}>
      <h1>Dashboard</h1>

      <div className={styles.midCardsContainer}>
        <HomeMidCards title={"Notification"} />
        <HomeMidCards title={"Recent Activity"} />
      </div>

      <div className={styles.chartFilters}>
        <div className={styles.filterGroup}>
          <label htmlFor="fromDate">From</label>
          <input
            id="fromDate"
            type="date"
            value={fromDate}
            max={toDate}
            onChange={
              /* Handles the change callback for this rendered control.
               * It accepts e and returns the delegated result. */
              (e) => setFromDate(e.target.value)}
          />
          <label htmlFor="toDate">To</label>
          <input
            id="toDate"
            type="date"
            value={toDate}
            min={fromDate}
            onChange={
              /* Handles the change callback for this rendered control.
               * It accepts e and returns the delegated result. */
              (e) => setToDate(e.target.value)}
          />
        </div>

        <div className={styles.categories}>
          <label htmlFor="categoryFilter">Category</label>
          <select
            id="categoryFilter"
            value={categoryFilter}
            onChange={
              /* Handles the change callback for this rendered control.
               * It accepts e and returns the delegated result. */
              (e) => {
                setCategoryFilter(e.target.value);
                setShowAllSeries(false);
              }}
          >
            <option value="all">All</option>
            {categories.map(
              /* Transforms each collection entry for the surrounding mapping.
               * It accepts category and returns the mapped value. */
              (category) => (
                <option key={category} value={category}>
                  {category}
                </option>
            ))}
          </select>

          {filteredSeries.length > TOP_SERIES_LIMIT && (
            <button
              type="button"
              className={styles.toggleSeriesBtn}
              onClick={
                /* Handles the click callback for this rendered control.
                 * It accepts no arguments and returns the delegated result. */
                () => setShowAllSeries(!showAllSeries)}
            >
              {showAllSeries
                ? `Show top ${TOP_SERIES_LIMIT}`
                : `Show all (${filteredSeries.length})`}
            </button>
          )}
        </div>
      </div>

      <div className={styles.bottomCardsContainer}>
        <HomeBottomCards
          title={"System Activity"}
          subtitle="System events over the selected period"
          type="line"
          data={systemActivityData}
          series={chartSeries}
          xKey="period"
          xTickFormatter={formatPeriodTick}
          tooltipLabelFormatter={formatPeriodTooltip}
          isLoading={isSystemActivityLoading}
          fullWidth
          emptyMessage="No system activity found for the selected period."
        />
      </div>
    </div>
  );
};

export default DashBoard;
