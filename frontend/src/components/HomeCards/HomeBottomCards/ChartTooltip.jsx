// Defines the Chart Tooltip React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import style from "./HomeBottomCards.module.css";

// Generic compact tooltip: hides zero values, sorts descending,
// shows "No activity" when every series is 0 for the hovered point.

// Renders the Chart Tooltip interface.
// Accepts an options object and returns rendered JSX.
const ChartTooltip = ({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}) => {
  if (!active || !payload?.length) return null;

  const visibleEntries = payload
    .filter(
      // Tests whether one collection entry belongs in the filtered result.
      // Accepts entry and returns a Boolean inclusion result.
      (entry) => Number(entry.value) > 0)
    .sort(
      // Compares two collection entries for their display order.
      // Accepts a and b and returns their numeric ordering.
      (a, b) => b.value - a.value);

  return (
    <div className={style.tooltip}>
      <p className={style.tooltipLabel}>
        {labelFormatter ? labelFormatter(label) : label}
      </p>
      {visibleEntries.length === 0 ? (
        <p className={style.tooltipEmpty}>No activity</p>
      ) : (
        <div className={style.tooltipEntries}>
          {visibleEntries.map(
            // Transforms one collection entry for the resulting list.
            // Accepts entry and returns the mapped entry.
            (entry) => (
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

export default ChartTooltip;
