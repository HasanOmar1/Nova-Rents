import HomeBottomCards from "../../../components/HomeCards/HomeBottomCards/HomeBottomCards";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import styles from "./Statistics.module.css";
import { BadgeDollarSign, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { useReportContext } from "../../../context/ReportContext";
import {
  formatPeriodTick,
  formatPeriodTooltip,
} from "../../../utils/periodFormat";

// Local-time date formatting (toISOString would shift the day near midnight)
const formatDateForInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Statistics = () => {
  const {
    statisticsData,
    isStatisticsLoading,
    statisticsErrorMsg,
    getStatistics,
  } = useReportContext();

  const today = new Date();
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const [fromDate, setFromDate] = useState(formatDateForInput(sixMonthsAgo));
  const [toDate, setToDate] = useState(formatDateForInput(today));

  const isRangeValid = Boolean(fromDate && toDate && fromDate <= toDate);

  useEffect(() => {
    getStatistics(fromDate, toDate);
  }, []);

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
        : `$${(Number(statisticsData.bookingValue) || 0).toLocaleString()}`,
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
          onChange={(e) => setFromDate(e.target.value)}
        />
        <label htmlFor="statsToDate">To</label>
        <input
          id="statsToDate"
          type="date"
          value={toDate}
          min={fromDate}
          onChange={(e) => setToDate(e.target.value)}
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
        {topData.map((item) => {
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
