import { Link } from "react-router-dom";
import HomeBottomCards from "../../../components/HomeCards/HomeBottomCards/HomeBottomCards";
import HomeMidCards from "../../../components/HomeCards/HomeMidCards/HomeMidCards";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import styles from "./Home.module.css";
import { CalendarDays, Wallet, ClipboardList, Key } from "lucide-react";
import { useRentContext } from "../../../context/RentContext";
import { useEffect, useState } from "react";
import { useActivityContext } from "../../../context/ActivityContext";
import { useReportContext } from "../../../context/ReportContext";
import {
  formatPeriodTick,
  formatPeriodTooltip,
} from "../../../utils/periodFormat";

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
];

const formatEventLabel = (eventName) =>
  eventName
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");

// Max usage series shown by default before the "Show all" toggle kicks in
const TOP_SERIES_LIMIT = 6;

// Project currency convention: "$" prefix + locale thousands separators
const formatCurrency = (value) => `$${(Number(value) || 0).toLocaleString()}`;

// Local-time date formatting (toISOString would shift the day near midnight)
const formatDateForInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Home = () => {
  const { metrics, fetchDashboardMetrics } = useRentContext();
  const { loadActivities } = useActivityContext();
  const {
    userDashboardData,
    isUserDashboardLoading,
    userDashboardErrorMsg,
    getUserDashboardReport,
  } = useReportContext();

  const today = new Date();
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  // Editable input values — changing these sends no request.
  const [fromDate, setFromDate] = useState(formatDateForInput(sixMonthsAgo));
  const [toDate, setToDate] = useState(formatDateForInput(today));
  // Applied query values — only updated when the user presses Apply.
  const [appliedFromDate, setAppliedFromDate] = useState(fromDate);
  const [appliedToDate, setAppliedToDate] = useState(toDate);
  const [showAllSeries, setShowAllSeries] = useState(false);

  const isRangeValid = Boolean(fromDate && toDate && fromDate <= toDate);

  useEffect(() => {
    fetchDashboardMetrics();
    loadActivities();
  }, []);

  useEffect(() => {
    getUserDashboardReport(appliedFromDate, appliedToDate);
  }, [appliedFromDate, appliedToDate]);

  const handleApplyDates = () => {
    if (isRangeValid && !isUserDashboardLoading) {
      setAppliedFromDate(fromDate);
      setAppliedToDate(toDate);
    }
  };

  // Total occurrences per event across the period (for top-N ranking)
  const seriesTotals = {};
  for (const serie of userDashboardData.usageSeries) {
    seriesTotals[serie.eventName] = userDashboardData.usageChartData.reduce(
      (sum, point) => sum + (point[serie.eventName] || 0),
      0,
    );
  }

  const isSeriesLimited =
    !showAllSeries && userDashboardData.usageSeries.length > TOP_SERIES_LIMIT;

  const visibleSeries = isSeriesLimited
    ? [...userDashboardData.usageSeries]
        .sort((a, b) => seriesTotals[b.eventName] - seriesTotals[a.eventName])
        .slice(0, TOP_SERIES_LIMIT)
    : userDashboardData.usageSeries;

  const usageChartSeries = visibleSeries.map((serie) => ({
    dataKey: serie.eventName,
    name: formatEventLabel(serie.eventName),
    color:
      CHART_COLORS[
        userDashboardData.usageSeries.indexOf(serie) % CHART_COLORS.length
      ],
  }));

  const hasEarnings = userDashboardData.earningsChartData.some(
    (point) => point.earnings > 0,
  );

  const topData = [
    {
      title: "Monthly Earnings",
      value: `$${metrics.monthlyEarnings.toLocaleString()}`,
      icon: <Wallet size={28} color="#a7d2eb" />,
    },
    {
      title: "Pending Requests",
      value: metrics.pendingRequests,
      isAction: true,
      icon: <ClipboardList size={28} color="#a7d2eb" />,
    },
    {
      title: "Upcoming Trips",
      isAction: true,
      value: metrics.upcomingTrips,
      icon: <CalendarDays size={28} color="#a7d2eb" />,
    },
    {
      title: "Trips Taken",
      isAction: true,
      value: metrics.tripsTaken,
      icon: <Key size={28} color="#a7d2eb" />,
    },
  ];

  return (
    <div className={`${styles.Home} page`}>
      <h1>Welcome back</h1>
      <div className={styles.btnsContainer}>
        <Link to={"/vehicles"} className={styles.browseVehiclesBtn}>
          Browse Vehicles
        </Link>
        <Link to={"/myVehicles"} className={styles.myVehiclesBtn}>
          My Vehicles
        </Link>
      </div>

      <div className={styles.topCardsContainer}>
        {topData.map((item) => {
          return (
            <HomeTopCards
              isAction={item.isAction}
              to={`/rentalDashboard`}
              key={crypto.randomUUID()}
              title={item.title}
              value={item.value}
              icon={item.icon}
            />
          );
        })}
      </div>

      <div className={styles.midCardsContainer}>
        <HomeMidCards title={"Notifications"} />
        <HomeMidCards title={"Recent Activity"} />
      </div>

      <div className={styles.chartFilters}>
        <div className={styles.filterGroup}>
          <label htmlFor="dashboardFromDate">From</label>
          <input
            id="dashboardFromDate"
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="dashboardToDate">To</label>
          <input
            id="dashboardToDate"
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={styles.applyBtn}
          onClick={handleApplyDates}
          disabled={!isRangeValid || isUserDashboardLoading}
        >
          {isUserDashboardLoading ? "Loading..." : "Apply"}
        </button>
        {userDashboardData.usageSeries.length > TOP_SERIES_LIMIT && (
          <button
            type="button"
            className={styles.toggleSeriesBtn}
            onClick={() => setShowAllSeries(!showAllSeries)}
          >
            {showAllSeries
              ? `Show top ${TOP_SERIES_LIMIT}`
              : `Show all (${userDashboardData.usageSeries.length})`}
          </button>
        )}
      </div>

      {userDashboardErrorMsg && (
        <p className={styles.chartError}>{userDashboardErrorMsg}</p>
      )}

      <div className={styles.bottomCardsContainer}>
        <HomeBottomCards
          title={"Earnings Overview"}
          subtitle="Completed rental earnings during the selected period"
          type="line"
          data={hasEarnings ? userDashboardData.earningsChartData : []}
          series={[{ dataKey: "earnings", name: "Earnings", color: "#2ed199" }]}
          xKey="period"
          xTickFormatter={formatPeriodTick}
          tooltipLabelFormatter={formatPeriodTooltip}
          valueFormatter={formatCurrency}
          yAxisWidth={48}
          isLoading={isUserDashboardLoading}
          showLegend={false}
          emptyMessage="No earnings found for the selected period."
        />
        <HomeBottomCards
          title={"Platform Usage"}
          subtitle="Your activity during the selected period"
          type="line"
          data={userDashboardData.usageChartData}
          series={usageChartSeries}
          xKey="period"
          xTickFormatter={formatPeriodTick}
          tooltipLabelFormatter={formatPeriodTooltip}
          isLoading={isUserDashboardLoading}
          emptyMessage="No activity found for the selected period."
        />
      </div>
    </div>
  );
};

export default Home;
