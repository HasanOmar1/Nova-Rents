// Presents owner vehicle performance across value, rentals, and reports.
// It takes no props and returns date controls, comparisons, and report views.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarCheck2, CalendarDays, Flag } from "lucide-react";
import HomeBottomCards from "../../../components/HomeCards/HomeBottomCards/HomeBottomCards";
import OwnerVehicleReportsModal from "../../../components/OwnerVehicleReportsModal/OwnerVehicleReportsModal";
import { useComplaintContext } from "../../../context/ComplaintContext";
import { useReportContext } from "../../../context/ReportContext";
import { useVehicleContext } from "../../../context/VehicleContext";
import {
  formatPeriodTick,
  formatPeriodTooltip,
} from "../../../utils/periodFormat";
import { formatCurrency } from "../../../utils/displayFormat";
import { useDateRange } from "../../../hooks/useDateRange";
import VehicleRentalCountChart from "./VehicleRentalCountChart";
import styles from "./VehicleAnalytics.module.css";

/* Derives vehicle chart color from the supplied input.
 * It accepts index and returns the derived value. */
const getVehicleChartColor = (index) => {
  const hue = Math.round((205 + index * 137.508) % 360);
  return `hsl(${hue}, 72%, 66%)`;
};

/* Formats comparison date for display.
 * It accepts value and returns formatted display text. */
const formatComparisonDate = (value) => {
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/* Derives vehicle display name from the supplied input.
 * It accepts name and licensePlate and returns the derived value. */
const getVehicleDisplayName = (name, licensePlate) => {
  const plateSuffix = ` (${licensePlate})`;
  return name.endsWith(plateSuffix)
    ? name.slice(0, -plateSuffix.length)
    : name;
};

/* Loads and renders value, rental, and report analytics for owned vehicles.
 * It accepts no arguments and returns the vehicle analytics page JSX. */
const VehicleAnalytics = () => {
  const {
    fromDate,
    toDate,
    setFromDate,
    setToDate,
    isRangeValid: isCustomRangeValid,
  } = useDateRange();
  const [rangeMode, setRangeMode] = useState("all");
  const [appliedFilter, setAppliedFilter] = useState({ range: "all" });
  const [selectedReportVehicle, setSelectedReportVehicle] = useState(null);
  const [selectedVehicleReports, setSelectedVehicleReports] = useState([]);
  const [isSelectedReportsLoading, setIsSelectedReportsLoading] =
    useState(false);
  const [selectedReportsError, setSelectedReportsError] = useState("");
  const reportRequestIdRef = useRef(0);

  const { vehicleInventoryVersion } = useVehicleContext();
  const { getOwnerVehicleReportHistory } = useComplaintContext();
  const {
    vehicleComparisonData,
    isVehicleComparisonLoading,
    vehicleComparisonErrorMsg,
    getVehicleComparison,
  } = useReportContext();

  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      getVehicleComparison(appliedFilter);
    }, [appliedFilter, getVehicleComparison, vehicleInventoryVersion]);

  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () =>
      /* Releases resources created by the surrounding operation.
       * It accepts no arguments and returns undefined. */
      () => {
        reportRequestIdRef.current += 1;
      },
    [],
  );

  const comparisonSeries = useMemo(
    /* Computes the memoized value used by this component.
     * It accepts no arguments and returns the derived value. */
    () =>
      vehicleComparisonData.series.map(
        /* Transforms each collection entry for the surrounding mapping.
         * It accepts serie and index and returns the mapped value. */
        (serie, index) => ({
          dataKey: serie.dataKey,
          licensePlate: String(serie.licensePlate),
          name: serie.name || String(serie.licensePlate),
          reportCount: Number(serie.reportCount) || 0,
          rentalCount: Number(serie.rentalCount) || 0,
          color: getVehicleChartColor(index),
        })),
    [vehicleComparisonData.series],
  );

  const comparisonChartData = useMemo(
    /* Computes the memoized value used by this component.
     * It accepts no arguments and returns the derived value. */
    () =>
      vehicleComparisonData.chartData.map(
        /* Transforms each collection entry for the surrounding mapping.
         * It accepts point and returns the mapped value. */
        (point) => {
          const normalizedPoint = { ...point };

          for (const serie of comparisonSeries) {
            normalizedPoint[serie.dataKey] =
              Number(normalizedPoint[serie.dataKey]) || 0;
          }

          return normalizedPoint;
        }),
    [comparisonSeries, vehicleComparisonData.chartData],
  );

  const vehicleValueRanking = useMemo(
    /* Computes the memoized value used by this component.
     * It accepts no arguments and returns the derived value. */
    () =>
      comparisonSeries
        .map(
          /* Transforms each collection entry for the surrounding mapping.
           * It accepts serie and returns the mapped value. */
          (serie) => ({
            ...serie,
            totalValue: comparisonChartData.reduce(
              /* Combines the current entry with the running aggregate.
               * It accepts total and point and returns the next aggregate. */
              (total, point) => total + (Number(point[serie.dataKey]) || 0),
              0,
            ),
          }))
        .sort(
          /* Orders two collection entries for the surrounding sort.
           * It accepts firstVehicle and secondVehicle and returns their numeric ordering. */
          (firstVehicle, secondVehicle) =>
            secondVehicle.totalValue - firstVehicle.totalValue ||
            firstVehicle.name.localeCompare(secondVehicle.name) ||
            firstVehicle.licensePlate.localeCompare(secondVehicle.licensePlate),
        ),
    [comparisonChartData, comparisonSeries],
  );

  const vehicleRentalCountData = useMemo(
    /* Computes the memoized value used by this component.
     * It accepts no arguments and returns the derived value. */
    () =>
      comparisonSeries
        .filter(
          /* Tests whether each collection entry belongs in the filtered result.
           * It accepts vehicle and returns a boolean. */
          (vehicle) => vehicle.rentalCount > 0)
        .sort(
          /* Orders two collection entries for the surrounding sort.
           * It accepts firstVehicle and secondVehicle and returns their numeric ordering. */
          (firstVehicle, secondVehicle) =>
            secondVehicle.rentalCount - firstVehicle.rentalCount ||
            firstVehicle.name.localeCompare(secondVehicle.name) ||
            firstVehicle.licensePlate.localeCompare(secondVehicle.licensePlate),
        )
        .map(
          /* Transforms each collection entry for the surrounding mapping.
           * It accepts destructured values and returns the mapped value. */
          ({ dataKey, name, licensePlate, rentalCount, color }) => ({
            dataKey,
            name: getVehicleDisplayName(name, licensePlate),
            licensePlate,
            rentalCount,
            color,
          })),
    [comparisonSeries],
  );

  const fleetTotalValue = vehicleValueRanking.reduce(
    /* Combines the current entry with the running aggregate.
     * It accepts total and vehicle and returns the next aggregate. */
    (total, vehicle) => total + vehicle.totalValue,
    0,
  );
  const highestVehicleValue = vehicleValueRanking[0]?.totalValue || 0;
  const appliedRangeLabel =
    appliedFilter.range === "all"
      ? "All time"
      : `${formatComparisonDate(appliedFilter.startDate)} - ${formatComparisonDate(
          appliedFilter.endDate,
        )}`;

  const hasComparisonValue = comparisonChartData.some(
    /* Checks whether the current entry satisfies the surrounding condition.
     * It accepts point and returns a boolean. */
    (point) =>
      comparisonSeries.some(
        /* Checks whether the current entry satisfies the surrounding condition.
         * It accepts serie and returns a boolean. */
        (serie) => point[serie.dataKey] > 0),
  );

  const comparisonEmptyMessage = vehicleComparisonErrorMsg
    ? "The vehicle comparison is unavailable right now."
    : comparisonSeries.length
      ? "No completed rental value was found for your vehicles in this period."
      : "Add a vehicle to start comparing completed rental value.";

  const rentalCountEmptyMessage = vehicleComparisonErrorMsg
    ? "The completed rental breakdown is unavailable right now."
    : comparisonSeries.length
      ? appliedFilter.range === "all"
        ? "No completed rentals have been recorded for your vehicles yet."
        : `No rentals ending between ${appliedRangeLabel} were completed.`
      : "Add a vehicle to start comparing completed rentals.";

  /* Switches the analytics request back to the all-time range.
   * It accepts no arguments and returns undefined. */
  const applyAllTime = () => {
    setRangeMode("all");
    setAppliedFilter(
      /* Derives the next applied filter state value.
       * It accepts currentFilter and returns the replacement state. */
      (currentFilter) =>
        currentFilter.range === "all" ? currentFilter : { range: "all" },
    );
  };

  /* Enables custom date inputs without submitting a new range yet.
   * It accepts no arguments and returns undefined. */
  const applyCustomMode = () => {
    setRangeMode("custom");
    if (isCustomRangeValid) {
      setAppliedFilter({
        range: "custom",
        startDate: fromDate,
        endDate: toDate,
      });
    }
  };

  /* Applies a valid custom date range to the analytics request.
   * It accepts no arguments and returns undefined. */
  const applyCustomDates = () => {
    if (!isCustomRangeValid || isVehicleComparisonLoading) return;

    const nextFilter = {
      range: "custom",
      startDate: fromDate,
      endDate: toDate,
    };

    if (
      appliedFilter.range === "custom" &&
      appliedFilter.startDate === fromDate &&
      appliedFilter.endDate === toDate
    ) {
      getVehicleComparison(nextFilter);
      return;
    }

    setAppliedFilter(nextFilter);
  };

  /* Loads report history and opens the modal for a selected vehicle.
   * It accepts plate/name fields and returns a promise resolved after loading. */
  const openVehicleReports = async ({ licensePlate, vehicleName }) => {
    const requestId = reportRequestIdRef.current + 1;
    reportRequestIdRef.current = requestId;
    setSelectedReportVehicle({ licensePlate, vehicleName });
    setSelectedVehicleReports([]);
    setSelectedReportsError("");
    setIsSelectedReportsLoading(true);

    try {
      const reports = await getOwnerVehicleReportHistory(licensePlate);
      if (reportRequestIdRef.current !== requestId) return;
      setSelectedVehicleReports(reports);
    } catch (error) {
      if (reportRequestIdRef.current !== requestId) return;
      setSelectedReportsError(
        error?.message || "Failed to load vehicle reports",
      );
    } finally {
      if (reportRequestIdRef.current === requestId) {
        setIsSelectedReportsLoading(false);
      }
    }
  };

  /* Closes the vehicle-report modal and invalidates its pending request.
   * It accepts no arguments and returns undefined. */
  const closeVehicleReports = () => {
    reportRequestIdRef.current += 1;
    setSelectedReportVehicle(null);
    setSelectedVehicleReports([]);
    setSelectedReportsError("");
    setIsSelectedReportsLoading(false);
  };

  const valueSummaryDescription =
    appliedFilter.range === "all"
      ? "Gross value across all recorded completed rentals, ranked highest to lowest."
      : `Gross value of completed rentals ending between ${appliedRangeLabel}, ranked highest to lowest.`;
  const rentalCountScopeDescription =
    appliedFilter.range === "all"
      ? "Rental counts cover all recorded completed rentals."
      : `Rental counts include rentals ending between ${appliedRangeLabel}.`;

  return (
    <main className={`${styles.VehicleAnalytics} page`}>
      <div className={styles.topBar}>
        <Link className={styles.backLink} to="/myVehicles">
          <ArrowLeft size={18} aria-hidden="true" /> Back to My Vehicles
        </Link>
        <span className={styles.appliedRangeBadge}>{appliedRangeLabel}</span>
      </div>

      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Owner analytics</p>
        <h1>Vehicle Performance</h1>
        <p>
          Compare completed rental value and rental frequency across your full
          vehicle inventory and see which vehicles perform best.
        </p>
      </header>

      <section
        className={styles.rangePanel}
        aria-labelledby="reporting-period-heading"
      >
        <div className={styles.rangePanelHeader}>
          <div className={styles.rangeTitle}>
            <span className={styles.rangeIcon} aria-hidden="true">
              <CalendarDays size={20} />
            </span>
            <div>
              <h2 id="reporting-period-heading">Reporting period</h2>
              <p>
                {rangeMode === "all"
                  ? "Showing all recorded completed rentals."
                  : "Choose the rental end dates you want to compare."}
              </p>
            </div>
          </div>

          <div
            className={styles.rangeToggle}
            role="group"
            aria-label="Vehicle analytics reporting period"
          >
            <button
              type="button"
              className={rangeMode === "all" ? styles.activeRange : ""}
              aria-pressed={rangeMode === "all"}
              onClick={applyAllTime}
            >
              All time
            </button>
            <button
              type="button"
              className={rangeMode === "custom" ? styles.activeRange : ""}
              aria-pressed={rangeMode === "custom"}
              onClick={applyCustomMode}
            >
              Custom dates
            </button>
          </div>
        </div>

        {rangeMode === "custom" && (
          <div className={styles.customDateControls}>
            <div className={styles.dateField}>
              <label htmlFor="vehicleAnalyticsFromDate">From</label>
              <input
                id="vehicleAnalyticsFromDate"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={
                  /* Handles the change callback for this rendered control.
                   * It accepts event and returns the delegated result. */
                  (event) => setFromDate(event.target.value)}
              />
            </div>

            <div className={styles.dateField}>
              <label htmlFor="vehicleAnalyticsToDate">To</label>
              <input
                id="vehicleAnalyticsToDate"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={
                  /* Handles the change callback for this rendered control.
                   * It accepts event and returns the delegated result. */
                  (event) => setToDate(event.target.value)}
              />
            </div>

            <button
              type="button"
              className={styles.applyDatesBtn}
              onClick={applyCustomDates}
              disabled={!isCustomRangeValid || isVehicleComparisonLoading}
            >
              {isVehicleComparisonLoading ? "Loading..." : "Apply dates"}
            </button>
          </div>
        )}
      </section>

      {rangeMode === "custom" && !isCustomRangeValid && (
        <p className={styles.analyticsError} role="alert">
          Choose a From date that is on or before the To date.
        </p>
      )}

      {vehicleComparisonErrorMsg && (
        <p className={styles.analyticsError} role="alert">
          {vehicleComparisonErrorMsg}
        </p>
      )}

      <section
        className={styles.vehicleValueSummary}
        aria-labelledby="vehicle-value-ranking-heading"
        aria-busy={isVehicleComparisonLoading}
      >
        <div className={styles.vehicleValueHeader}>
          <div>
            <h2 id="vehicle-value-ranking-heading">
              Total Value by Vehicle
            </h2>
            <p>
              {valueSummaryDescription} {rentalCountScopeDescription} Vehicle
              report counts are all time and do not change with this period.
            </p>
          </div>

          {!isVehicleComparisonLoading &&
            !vehicleComparisonErrorMsg &&
            vehicleValueRanking.length > 0 && (
              <div className={styles.fleetTotalValue}>
                <span>Fleet total</span>
                <strong>{formatCurrency(fleetTotalValue)}</strong>
              </div>
            )}
        </div>

        {isVehicleComparisonLoading ? (
          <p className={styles.vehicleValueState} aria-live="polite">
            Loading vehicle totals...
          </p>
        ) : vehicleComparisonErrorMsg ? (
          <p className={styles.vehicleValueState}>
            Vehicle totals are unavailable right now.
          </p>
        ) : vehicleValueRanking.length === 0 ? (
          <p className={styles.vehicleValueState}>
            Add a vehicle to start comparing completed rental value.
          </p>
        ) : (
          <ol className={styles.vehicleValueList}>
            {vehicleValueRanking.map(
              /* Transforms each collection entry for the surrounding mapping.
               * It accepts vehicle and index and returns the mapped value. */
              (vehicle, index) => {
                const vehicleName = getVehicleDisplayName(
                  vehicle.name,
                  vehicle.licensePlate,
                );
                const relativeValue = highestVehicleValue
                  ? (vehicle.totalValue / highestVehicleValue) * 100
                  : 0;
                const reportCountLabel = `${vehicle.reportCount} ${
                  vehicle.reportCount === 1 ? "report" : "reports"
                }`;
                const rentalCountLabel = `${vehicle.rentalCount} ${
                  vehicle.rentalCount === 1 ? "rental" : "rentals"
                }`;

                return (
                  <li key={vehicle.dataKey} className={styles.vehicleValueRow}>
                    <Link
                      className={styles.vehicleValueRowLink}
                      to={`/vehicles/${encodeURIComponent(vehicle.licensePlate)}`}
                      state={{
                        vehicle: {
                          licensePlate: vehicle.licensePlate,
                          vehName: vehicleName,
                        },
                        returnTo: "/myVehicles/analytics",
                      }}
                      aria-label={`View details for ${vehicleName}, plate ${vehicle.licensePlate}`}
                    />
                    <span className={styles.vehicleValueRank}>{index + 1}</span>

                    <div className={styles.vehicleValueDetails}>
                      <div className={styles.vehicleValueIdentity}>
                        <span
                          className={styles.vehicleValueDot}
                          style={{ backgroundColor: vehicle.color }}
                          aria-hidden="true"
                        />
                        <div className={styles.vehicleValueMeta}>
                          <div className={styles.vehicleValueNameRow}>
                            <strong>{vehicleName}</strong>
                            <span
                              className={styles.rentalCountBadge}
                              title={
                                appliedFilter.range === "all"
                                  ? `${rentalCountLabel} across all time`
                                  : `${rentalCountLabel} ending between ${appliedRangeLabel}`
                              }
                            >
                              <CalendarCheck2 size={12} aria-hidden="true" />
                              {rentalCountLabel}
                            </span>
                            {vehicle.reportCount > 0 ? (
                              <button
                                type="button"
                                className={`${styles.reportCountBadge} ${styles.reportCountButton}`}
                                onClick={
                                  /* Handles the click callback for this rendered control.
                                   * It accepts no arguments and returns the delegated result. */
                                  () =>
                                    openVehicleReports({
                                      licensePlate: vehicle.licensePlate,
                                      vehicleName,
                                    })
                                }
                                title="View all-time report details"
                                aria-label={`View ${reportCountLabel} for ${vehicleName}`}
                                aria-haspopup="dialog"
                                aria-expanded={
                                  selectedReportVehicle?.licensePlate ===
                                  vehicle.licensePlate
                                }
                              >
                                <Flag size={12} aria-hidden="true" />
                                {reportCountLabel}
                              </button>
                            ) : (
                              <span
                                className={`${styles.reportCountBadge} ${styles.reportCountBadgeEmpty}`}
                                title={`No all-time reports for ${vehicleName}`}
                              >
                                <Flag size={12} aria-hidden="true" />
                                {reportCountLabel}
                              </span>
                            )}
                          </div>
                          <span className={styles.vehiclePlate}>
                            Plate {vehicle.licensePlate}
                          </span>
                        </div>
                      </div>

                      <div className={styles.vehicleValueBar} aria-hidden="true">
                        <span
                          style={{
                            width: `${relativeValue}%`,
                            backgroundColor: vehicle.color,
                          }}
                        />
                      </div>
                    </div>

                    <div className={styles.vehicleValueAmount}>
                      {index === 0 && vehicle.totalValue > 0 && (
                        <span>Highest value</span>
                      )}
                      <strong>{formatCurrency(vehicle.totalValue)}</strong>
                    </div>
                  </li>
                );
              })}
          </ol>
        )}
      </section>

      <div className={styles.chartSection}>
        <HomeBottomCards
          title="Completed Rental Value by Vehicle"
          subtitle={
            appliedFilter.range === "all"
              ? "All recorded completed rental value, grouped over time"
              : `Completed rental value for rentals ending between ${appliedRangeLabel}`
          }
          type="line"
          data={hasComparisonValue ? comparisonChartData : []}
          series={comparisonSeries}
          xKey="period"
          xTickFormatter={formatPeriodTick}
          tooltipLabelFormatter={formatPeriodTooltip}
          valueFormatter={formatCurrency}
          yAxisWidth={58}
          isLoading={isVehicleComparisonLoading}
          emptyMessage={comparisonEmptyMessage}
          fullWidth
          chartHeight={360}
        />
        <VehicleRentalCountChart
          data={vehicleRentalCountData}
          isLoading={isVehicleComparisonLoading}
          emptyMessage={rentalCountEmptyMessage}
          rangeLabel={appliedRangeLabel}
        />
      </div>

      <OwnerVehicleReportsModal
        isOpen={Boolean(selectedReportVehicle)}
        onClose={closeVehicleReports}
        heading="All-time vehicle reports"
        vehicleLabel={
          selectedReportVehicle
            ? `${selectedReportVehicle.vehicleName} (Plate ${selectedReportVehicle.licensePlate})`
            : "Your vehicle"
        }
        reports={selectedVehicleReports}
        isLoading={isSelectedReportsLoading}
        errorMessage={selectedReportsError}
        emptyMessage="No reports have been filed for this vehicle."
      />
    </main>
  );
};

export default VehicleAnalytics;
