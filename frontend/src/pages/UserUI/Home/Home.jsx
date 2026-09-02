// Builds the user's dashboard from rental metrics and reporting series.
// It takes no props and returns summary cards, filters, and charts.
import { Link } from "react-router-dom";
import HomeBottomCards from "../../../components/HomeCards/HomeBottomCards/HomeBottomCards";
import HomeMidCards from "../../../components/HomeCards/HomeMidCards/HomeMidCards";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import styles from "./Home.module.css";
import { Clock, CreditCard, Wallet, ClipboardList } from "lucide-react";
import { useRentContext } from "../../../context/RentContext";
import { useEffect, useState } from "react";
import { useReportContext } from "../../../context/ReportContext";
import {
  formatPeriodTick,
  formatPeriodTooltip,
} from "../../../utils/periodFormat";
import { useAppliedDateRange } from "../../../hooks/useAppliedDateRange";
import {
  formatCurrency,
  formatEventLabel,
} from "../../../utils/displayFormat";

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

const EVENT_LABELS = {
  vehicle_created: "Vehicles Listed",
};

// Max usage series shown by default before the "Show all" toggle kicks in
const TOP_SERIES_LIMIT = 6;

// Loads dashboard metrics and renders the user's overview page.
// It takes no props and returns dashboard controls, cards, and chart JSX.
const Home = () => {
  const { metrics, fetchDashboardMetrics } = useRentContext();
  const {
    userDashboardData,
    isUserDashboardLoading,
    userDashboardErrorMsg,
    getUserDashboardReport,
  } = useReportContext();

  // Keep date edits local until the user applies a complete range.
  const {
    fromDate,
    toDate,
    setFromDate,
    setToDate,
    isRangeValid,
    appliedFromDate,
    appliedToDate,
    applyDateRange,
  } = useAppliedDateRange();
  const [showAllSeries, setShowAllSeries] = useState(false);

  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      fetchDashboardMetrics();
    }, [fetchDashboardMetrics]);

  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      getUserDashboardReport(appliedFromDate, appliedToDate);
    }, [appliedFromDate, appliedToDate, getUserDashboardReport]);

  // Commits the edited reporting dates when the range can be applied.
  // It takes no arguments and returns undefined.
  const handleApplyDates = () => {
    if (isRangeValid && !isUserDashboardLoading) {
      applyDateRange();
    }
  };

  // Total occurrences per event across the period (for top-N ranking)
  const seriesTotals = {};
  for (const serie of userDashboardData.usageSeries) {
    seriesTotals[serie.eventName] = userDashboardData.usageChartData.reduce(
      /* Combines the current entry with the running aggregate.
       * It accepts sum and point and returns the next aggregate. */
      (sum, point) => sum + (point[serie.eventName] || 0),
      0,
    );
  }

  const isSeriesLimited =
    !showAllSeries && userDashboardData.usageSeries.length > TOP_SERIES_LIMIT;

  const visibleSeries = isSeriesLimited
    ? [...userDashboardData.usageSeries]
        .sort(
          /* Orders two collection entries for the surrounding sort.
           * It accepts a and b and returns their numeric ordering. */
          (a, b) => seriesTotals[b.eventName] - seriesTotals[a.eventName])
        .slice(0, TOP_SERIES_LIMIT)
    : userDashboardData.usageSeries;

  const usageChartSeries = visibleSeries.map(
    /* Transforms each collection entry for the surrounding mapping.
     * It accepts serie and returns the mapped value. */
    (serie) => ({
      dataKey: serie.eventName,
      name: formatEventLabel(serie.eventName, EVENT_LABELS),
      color:
        CHART_COLORS[
          userDashboardData.usageSeries.indexOf(serie) % CHART_COLORS.length
        ],
    }));

  const hasEarnings = userDashboardData.earningsChartData.some(
    /* Checks whether the current entry satisfies the surrounding condition.
     * It accepts point and returns a boolean. */
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
      title: "Payment Required",
      isAction: true,
      value: metrics.paymentRequired,
      icon: <CreditCard size={28} color="#f6c445" />,
    },
    {
      title: "Waiting for Owner Approval",
      isAction: true,
      value: metrics.waitingForOwnerApproval,
      icon: <Clock size={28} color="#a7d2eb" />,
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
        {topData.map(
          /* Transforms each collection entry for the surrounding mapping.
           * It accepts item and returns the mapped value. */
          (item) => {
            return (
              <HomeTopCards
                isAction={item.isAction}
                to={`/rentalDashboard`}
                key={item.title}
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
            onChange={
              /* Handles the change callback for this rendered control.
               * It accepts e and returns the delegated result. */
              (e) => setFromDate(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="dashboardToDate">To</label>
          <input
            id="dashboardToDate"
            type="date"
            value={toDate}
            min={fromDate}
            onChange={
              /* Handles the change callback for this rendered control.
               * It accepts e and returns the delegated result. */
              (e) => setToDate(e.target.value)}
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
            onClick={
              /* Handles the click callback for this rendered control.
               * It accepts no arguments and returns the delegated result. */
              () => setShowAllSeries(!showAllSeries)}
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
