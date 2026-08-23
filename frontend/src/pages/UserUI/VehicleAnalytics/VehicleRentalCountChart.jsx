import { useId } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import styles from "./VehicleRentalCountChart.module.css";

const CHART_HEIGHT = 280;

const VehicleRentalCountChart = ({
  data,
  isLoading,
  emptyMessage,
  rangeLabel,
}) => {
  const titleId = useId();
  const chartData = Array.isArray(data) ? data : [];
  const totalRentals = chartData.reduce(
    (total, vehicle) => total + (Number(vehicle.rentalCount) || 0),
    0,
  );
  const totalLabel = totalRentals.toLocaleString();
  const hasData = chartData.length > 0 && totalRentals > 0;

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
              role="img"
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
                    {chartData.map((vehicle) => (
                      <Cell key={vehicle.dataKey} fill={vehicle.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={false}
                    wrapperStyle={{ outline: "none", zIndex: 10 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;

                      const vehicle = payload[0]?.payload;
                      const rentalCount =
                        Number(vehicle?.rentalCount) || 0;
                      const percentage = totalRentals
                        ? Math.round((rentalCount / totalRentals) * 100)
                        : 0;

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
                              {percentage}% of total
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
            </div>
            <ul
              className={styles.legendList}
              aria-label="Completed rental counts by vehicle"
            >
              {chartData.map((vehicle) => {
                const rentalCount = Number(vehicle.rentalCount) || 0;

                return (
                  <li key={vehicle.dataKey} className={styles.legendItem}>
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
                      <span>{rentalCount === 1 ? "rental" : "rentals"}</span>
                    </div>
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
