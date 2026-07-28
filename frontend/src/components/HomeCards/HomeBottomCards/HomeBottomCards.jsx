import style from "./HomeBottomCards.module.css";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// Generic compact tooltip: hides zero values, sorts descending,
// shows "No activity" when every series is 0 for the hovered point.
const ChartTooltip = ({ active, payload, label, labelFormatter, valueFormatter }) => {
  if (!active || !payload?.length) return null;

  const visibleEntries = payload
    .filter((entry) => Number(entry.value) > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className={style.tooltip}>
      <p className={style.tooltipLabel}>
        {labelFormatter ? labelFormatter(label) : label}
      </p>
      {visibleEntries.length === 0 ? (
        <p className={style.tooltipEmpty}>No activity</p>
      ) : (
        <div className={style.tooltipEntries}>
          {visibleEntries.map((entry) => (
            <div key={entry.dataKey} className={style.tooltipEntry}>
              <span
                className={style.tooltipDot}
                style={{ backgroundColor: entry.color }}
              />
              <span className={style.tooltipName}>{entry.name}</span>
              <span className={style.tooltipValue}>
                {valueFormatter ? valueFormatter(entry.value) : entry.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const HomeBottomCards = ({
  title,
  subtitle,
  type,
  data,
  dataKey,
  series,
  xKey = "month",
  xTickFormatter,
  tooltipLabelFormatter,
  emptyMessage,
  isLoading = false,
  fullWidth = false,
  showLegend = true,
  chartHeight,
  valueFormatter,
  yAxisWidth,
}) => {
  const isEmpty =
    !data?.length || (series !== undefined && series.length === 0);

  const plotHeight = chartHeight ?? (fullWidth ? 300 : 220);
  // Wider Y-axis values (e.g. currency) need their full width; the default
  // compact variant pulls the plot left because counts are short.
  const resolvedYAxisWidth = yAxisWidth ?? (fullWidth ? 36 : 30);
  const lineMargin = fullWidth
    ? { top: 12, right: 20, left: 4, bottom: 28 }
    : { top: 10, right: 16, left: yAxisWidth ? 0 : -16, bottom: 8 };

  return (
    <div
      className={`${style.HomeBottomCards} ${fullWidth ? style.fullWidth : ""}`}
    >
      <div className={style.header}>
        <h3>{title}</h3>
        {subtitle && <p className={style.subtitle}>{subtitle}</p>}
      </div>

      {isLoading ? (
        <div className={style.emptyState}>Loading chart data...</div>
      ) : isEmpty && emptyMessage ? (
        <div className={style.emptyState}>{emptyMessage}</div>
      ) : (
        <>
          <div
            className={style.statistics}
            style={{ height: plotHeight, minHeight: plotHeight }}
          >
            {/* Explicit pixel height: with height="100%" inside a flex item,
                recharts v3 can fall back to its minHeight and leave a blank
                band below the plot. */}
            <ResponsiveContainer
              width="100%"
              height={plotHeight}
              minWidth={0}
            >
              {type === "line" ? (
                <LineChart data={data} margin={lineMargin}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#2a2a2a"
                  />
                  <XAxis
                    dataKey={xKey}
                    stroke="#888"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: fullWidth ? 12 : 11, fill: "#888" }}
                    dy={10}
                    tickFormatter={xTickFormatter}
                    minTickGap={fullWidth ? 36 : 24}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#888"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "#888" }}
                    allowDecimals={false}
                    width={resolvedYAxisWidth}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        labelFormatter={tooltipLabelFormatter}
                        valueFormatter={valueFormatter}
                      />
                    }
                    wrapperStyle={{ outline: "none", zIndex: 10 }}
                  />
                  {series?.length > 0 ? (
                    series.map((serie) => (
                      <Line
                        key={serie.dataKey}
                        type="monotone"
                        dataKey={serie.dataKey}
                        name={serie.name || serie.dataKey}
                        stroke={serie.color || "#5494ff"}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        isAnimationActive={false}
                      />
                    ))
                  ) : (
                    <Line
                      type="monotone"
                      dataKey={dataKey}
                      stroke="#5494ff"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  )}
                </LineChart>
              ) : (
                <BarChart
                  data={data}
                  margin={{ top: 10, right: 16, left: -20, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#2a2a2a"
                  />

                  <XAxis
                    dataKey={xKey}
                    stroke="#888"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                    dy={10}
                    tickFormatter={xTickFormatter}
                    minTickGap={24}
                  />
                  <YAxis
                    stroke="#888"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                    allowDecimals={false}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e1e1e",
                      borderColor: "#333",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    cursor={{ fill: "#2a2a2a" }}
                  />

                  <Bar
                    dataKey={dataKey}
                    fill="#2ed199"
                    radius={[4, 4, 0, 0]}
                    barSize={35}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {showLegend && series?.length > 0 && (
            <div className={style.legend}>
              {series.map((serie) => (
                <div key={serie.dataKey} className={style.legendItem}>
                  <span
                    className={style.legendDot}
                    style={{ backgroundColor: serie.color || "#5494ff" }}
                  />
                  <span className={style.legendName}>
                    {serie.name || serie.dataKey}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HomeBottomCards;
