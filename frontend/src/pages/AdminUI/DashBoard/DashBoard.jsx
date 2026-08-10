import styles from "./DashBoard.module.css";
import HomeBottomCards from "../../../components/HomeCards/HomeBottomCards/HomeBottomCards";
import HomeMidCards from "../../../components/HomeCards/HomeMidCards/HomeMidCards";
import { useReportContext } from "../../../context/ReportContext";
import {
  formatPeriodTick,
  formatPeriodTooltip,
} from "../../../utils/periodFormat";
import { useEffect, useState } from "react";

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

const formatEventLabel = (eventName) =>
  eventName
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");

// Max series shown by default before the "Show all" toggle kicks in
const TOP_SERIES_LIMIT = 6;

// Local-time date formatting (toISOString would shift the day near midnight)
const formatDateForInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const DashBoard = () => {
  const {
    systemActivityData,
    systemActivitySeries,
    isSystemActivityLoading,
    getSystemActivityChart,
  } = useReportContext();

  const today = new Date();
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const [fromDate, setFromDate] = useState(formatDateForInput(sixMonthsAgo));
  const [toDate, setToDate] = useState(formatDateForInput(today));
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAllSeries, setShowAllSeries] = useState(false);

  useEffect(() => {
    if (fromDate && toDate && fromDate <= toDate) {
      getSystemActivityChart(fromDate, toDate);
    }
  }, [fromDate, toDate]);

  const categories = [
    ...new Set(systemActivitySeries.map((serie) => serie.category)),
  ];

  // Total occurrences per event across the whole period (for top-N ranking)
  const seriesTotals = {};
  for (const serie of systemActivitySeries) {
    seriesTotals[serie.eventName] = systemActivityData.reduce(
      (sum, point) => sum + (point[serie.eventName] || 0),
      0,
    );
  }

  const filteredSeries = systemActivitySeries.filter(
    (serie) => categoryFilter === "all" || serie.category === categoryFilter,
  );

  const isSeriesLimited =
    !showAllSeries && filteredSeries.length > TOP_SERIES_LIMIT;

  const visibleSeries = isSeriesLimited
    ? [...filteredSeries]
        .sort((a, b) => seriesTotals[b.eventName] - seriesTotals[a.eventName])
        .slice(0, TOP_SERIES_LIMIT)
    : filteredSeries;

  const chartSeries = visibleSeries.map((serie) => ({
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
            onChange={(e) => setFromDate(e.target.value)}
          />
          <label htmlFor="toDate">To</label>
          <input
            id="toDate"
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <div className={styles.categories}>
          <label htmlFor="categoryFilter">Category</label>
          <select
            id="categoryFilter"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setShowAllSeries(false);
            }}
          >
            <option value="all">All</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {filteredSeries.length > TOP_SERIES_LIMIT && (
            <button
              type="button"
              className={styles.toggleSeriesBtn}
              onClick={() => setShowAllSeries(!showAllSeries)}
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
