// Visualizes rental totals per vehicle and links chart entries to details.
// It accepts chart data and labels and returns an accessible donut chart.
import { useId } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import styles from "./VehicleRentalCountChart.module.css";

const CHART_HEIGHT = 280;
const VEHICLE_ANALYTICS_PATH = "/myVehicles/analytics";

/* Derives vehicle path from the supplied input.
 * It accepts licensePlate and returns the derived value. */
const getVehiclePath = (licensePlate) =>
  `/vehicles/${encodeURIComponent(licensePlate)}`;

/* Derives vehicle route state from the supplied input.
 * It accepts vehicle and returns the derived value. */
const getVehicleRouteState = (vehicle) => ({
  vehicle: {
    licensePlate: vehicle.licensePlate,
    vehName: vehicle.name,
  },
  returnTo: VEHICLE_ANALYTICS_PATH,
});

/* Formats percentage for display.
 * It accepts count and total and returns formatted display text. */
const formatPercentage = (count, total) => {
  if (!total) return "0%";

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format((count / total) * 100)}%`;
};

/* Renders an accessible rental-count donut chart and its vehicle legend.
 * It accepts chart data, loading text, and a title, then returns chart JSX. */
const VehicleRentalCountChart = ({
  data,
  isLoading,
  emptyMessage,
  rangeLabel,
}) => {
  const titleId = useId();
  const navigate = useNavigate();
  const chartData = Array.isArray(data) ? data : [];
  const totalRentals = chartData.reduce(
    /* Combines the current entry with the running aggregate.
     * It accepts total and vehicle and returns the next aggregate. */
    (total, vehicle) => total + (Number(vehicle.rentalCount) || 0),
    0,
  );
  const totalLabel = totalRentals.toLocaleString();
  const hasData = chartData.length > 0 && totalRentals > 0;
  /* Navigates from a chart entry to that vehicle's detail page.
   * It accepts a vehicle data point and returns undefined. */
  const openVehicle = (vehicle) => {
    navigate(getVehiclePath(vehicle.licensePlate), {
      state: getVehicleRouteState(vehicle),
    });
  };

  /* Opens a vehicle when its chart slice receives Enter or Space.
   * It accepts a keyboard event and vehicle, then returns undefined. */
  const handleSliceKeyDown = (event, vehicle) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    openVehicle(vehicle);
  };

  return (
    <section
      className={styles.card}
      aria-labelledby={titleId}
      aria-busy={isLoading}
    >
      <header className={styles.header}>
        <div>
          <h2 id={titleId}>Completed Rentals by Vehicle</h2>
          <p>
            {rangeLabel
              ? `Share of completed rentals · ${rangeLabel}`
              : "Share of completed rentals across your vehicles"}
          </p>
          {!isLoading && hasData && (
            <p className={styles.interactionHint}>
              Hover over a chart segment to see more details.
            </p>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className={styles.state} role="status" aria-live="polite">
          Loading vehicle rental counts...
        </div>
      ) : !hasData ? (
        <div className={styles.state} role="status">
          {emptyMessage || "No completed rentals found for this period."}
        </div>
      ) : (
        <div className={styles.content}>
          <div className={styles.chartPanel}>
            <div
              className={styles.chartCanvas}
              role="group"
              aria-label={`${totalLabel} completed ${totalRentals === 1 ? "rental" : "rentals"} across ${chartData.length} ${chartData.length === 1 ? "vehicle" : "vehicles"}. Details are listed with the chart.`}
            >
              <ResponsiveContainer
                width="100%"
                height={CHART_HEIGHT}
                minWidth={0}
              >
                <PieChart accessibilityLayer>
                  <Pie
                    data={chartData}
                    dataKey="rentalCount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={104}
                    paddingAngle={chartData.length > 1 ? 2 : 0}
                    minAngle={2}
                    stroke="rgba(10, 14, 22, 0.9)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {chartData.map(
                      /* Transforms each collection entry for the surrounding mapping.
                       * It accepts vehicle and returns the mapped value. */
                      (vehicle) => (
                        <Cell
                          key={vehicle.dataKey}
                          fill={vehicle.color}
                          role="link"
                          tabIndex={0}
                          aria-label={`View details for ${vehicle.name}, plate ${vehicle.licensePlate}`}
                          className={styles.chartSlice}
                          onClick={
                            /* Handles the click callback for this rendered control.
                             * It accepts no arguments and returns the delegated result. */
                            () => openVehicle(vehicle)}
                          onKeyDown={
                            /* Handles the key down callback for this rendered control.
                             * It accepts event and returns the delegated result. */
                            (event) =>
                              handleSliceKeyDown(event, vehicle)
                          }
                        />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={false}
                    wrapperStyle={{ outline: "none", zIndex: 10 }}
                    content={
                      /* Handles the content callback for this rendered control.
                       * It accepts destructured values and returns the delegated result. */
                      ({ active, payload }) => {
                        if (!active || !payload?.length) return null;

                        const vehicle = payload[0]?.payload;
                        const rentalCount =
                          Number(vehicle?.rentalCount) || 0;
                        const percentage = formatPercentage(
                          rentalCount,
                          totalRentals,
                        );

                        return (
                          <div className={styles.tooltip}>
                            <div className={styles.tooltipHeading}>
                              <span
                                className={styles.tooltipDot}
                                style={{ backgroundColor: vehicle?.color }}
                                aria-hidden="true"
                              />
                              <strong>{vehicle?.name}</strong>
                            </div>
                            <span className={styles.tooltipPlate}>
                              Plate {vehicle?.licensePlate}
                            </span>
                            <div className={styles.tooltipValue}>
                              <strong>{rentalCount.toLocaleString()}</strong>
                              <span>
                                {rentalCount === 1 ? "rental" : "rentals"} ·{" "}
                                {percentage} of total
                              </span>
                            </div>
                          </div>
                        );
                      }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className={styles.centerLabel} aria-hidden="true">
                <strong>{totalLabel}</strong>
                <span>{totalRentals === 1 ? "rental" : "rentals"}</span>
              </div>
            </div>
          </div>

          <div className={styles.legendPanel}>
            <div className={styles.legendHeading} aria-hidden="true">
              <span>Vehicle</span>
              <span>Rentals</span>
              <span>Share</span>
            </div>
            <ul
              className={styles.legendList}
              aria-label="Completed rental counts by vehicle"
            >
              {chartData.map(
                /* Transforms each collection entry for the surrounding mapping.
                 * It accepts vehicle and returns the mapped value. */
                (vehicle) => {
                  const rentalCount = Number(vehicle.rentalCount) || 0;
                  const percentage = formatPercentage(
                    rentalCount,
                    totalRentals,
                  );

                  return (
                    <li key={vehicle.dataKey} className={styles.legendItem}>
                      <Link
                        className={styles.legendLink}
                        to={getVehiclePath(vehicle.licensePlate)}
                        state={getVehicleRouteState(vehicle)}
                        aria-label={`${vehicle.name}, plate ${vehicle.licensePlate}: ${rentalCount.toLocaleString()} completed ${rentalCount === 1 ? "rental" : "rentals"}, ${percentage} of total. View vehicle details.`}
                      >
                        <div className={styles.vehicleIdentity}>
                          <span
                            className={styles.legendDot}
                            style={{ backgroundColor: vehicle.color }}
                            aria-hidden="true"
                          />
                          <div className={styles.vehicleMeta}>
                            <strong>{vehicle.name}</strong>
                            <span>Plate {vehicle.licensePlate}</span>
                          </div>
                        </div>
                        <div className={styles.legendValue}>
                          <strong>{rentalCount.toLocaleString()}</strong>
                          <span>
                            {rentalCount === 1 ? "rental" : "rentals"}
                          </span>
                        </div>
                        <strong className={styles.legendPercentage}>
                          {percentage}
                        </strong>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
};

export default VehicleRentalCountChart;
