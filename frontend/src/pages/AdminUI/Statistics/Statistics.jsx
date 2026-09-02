// Presents admin booking statistics for a selectable reporting period.
// It takes no props and returns date controls, totals, and a trend chart.
import HomeBottomCards from "../../../components/HomeCards/HomeBottomCards/HomeBottomCards";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import styles from "./Statistics.module.css";
import { BadgeDollarSign, Calendar } from "lucide-react";
import { useEffect } from "react";
import { useReportContext } from "../../../context/ReportContext";
import { useDateRange } from "../../../hooks/useDateRange";
import {
  formatPeriodTick,
  formatPeriodTooltip,
} from "../../../utils/periodFormat";
import { formatCurrency } from "../../../utils/displayFormat";

// Loads and renders booking statistics for the selected date range.
// It takes no props and returns the statistics page JSX.
const Statistics = () => {
  const {
    statisticsData,
    isStatisticsLoading,
    statisticsErrorMsg,
    getStatistics,
  } = useReportContext();

  const {
    fromDate,
    toDate,
    setFromDate,
    setToDate,
    isRangeValid,
  } = useDateRange();

  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      getStatistics(fromDate, toDate);
    }, []);

  // Requests fresh statistics when the selected range is valid and idle.
  // It takes no arguments and returns undefined.
  const handleApply = () => {
    if (isRangeValid && !isStatisticsLoading) {
      getStatistics(fromDate, toDate);
    }
  };

  // No commission column exists in the DB, so this is the gross totalPrice of
  // approved + completed bookings created in the range, not platform revenue.
  const topData = [
    {
      title: "Booking Value",
      value: isStatisticsLoading
        ? "..."
        : formatCurrency(statisticsData.bookingValue),
      icon: <BadgeDollarSign size={28} color="#a7d2eb" />,
    },
    {
      title: "Bookings",
      value: isStatisticsLoading
        ? "..."
        : (Number(statisticsData.bookings) || 0).toLocaleString(),
      icon: <Calendar size={28} color="#a7d2eb" />,
    },
  ];

  const hasBookings = statisticsData.bookingsChartData.some(
    /* Checks whether the current entry satisfies the surrounding condition.
     * It accepts point and returns a boolean. */
    (point) => point.bookings > 0,
  );

  return (
    <div className={`${styles.Statistics} page`}>
      <h1>Statistics</h1>

      <div className={styles.filtersToolbar}>
        <label htmlFor="statsFromDate">From</label>
        <input
          id="statsFromDate"
          type="date"
          value={fromDate}
          max={toDate}
          onChange={
            /* Handles the change callback for this rendered control.
             * It accepts e and returns the delegated result. */
            (e) => setFromDate(e.target.value)}
        />
        <label htmlFor="statsToDate">To</label>
        <input
          id="statsToDate"
          type="date"
          value={toDate}
          min={fromDate}
          onChange={
            /* Handles the change callback for this rendered control.
             * It accepts e and returns the delegated result. */
            (e) => setToDate(e.target.value)}
        />
        <button
          type="button"
          className={styles.applyBtn}
          onClick={handleApply}
          disabled={!isRangeValid || isStatisticsLoading}
        >
          {isStatisticsLoading ? "Loading..." : "Apply"}
        </button>
        {statisticsErrorMsg && (
          <p className={styles.errorText}>{statisticsErrorMsg}</p>
        )}
      </div>

      <div className={styles.topCardsContainer}>
        {topData.map(
          /* Transforms each collection entry for the surrounding mapping.
           * It accepts item and returns the mapped value. */
          (item) => {
            return (
              <HomeTopCards
                key={item.title}
                title={item.title}
                value={item.value}
                icon={item.icon}
              />
            );
          })}
      </div>

      <div className={styles.bottomCardsContainer}>
        <HomeBottomCards
          title={"Bookings over time"}
          subtitle="Approved and completed booking requests created during the selected period"
          type="line"
          data={hasBookings ? statisticsData.bookingsChartData : []}
          series={[{ dataKey: "bookings", name: "Bookings", color: "#5494ff" }]}
          xKey="period"
          xTickFormatter={formatPeriodTick}
          tooltipLabelFormatter={formatPeriodTooltip}
          isLoading={isStatisticsLoading}
          fullWidth
          showLegend={false}
          emptyMessage="No approved bookings found for the selected period."
        />
      </div>
    </div>
  );
};

export default Statistics;
