import style from "./HomeBottomCards.module.css";

// Generic compact tooltip: hides zero values, sorts descending,
// shows "No activity" when every series is 0 for the hovered point.
const ChartTooltip = ({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}) => {
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

export default ChartTooltip;
