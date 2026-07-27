const STATUS_CODE = require("../constants/statusCodes");
const {
  getSystemActivityChartData,
} = require("../database/queries/systemHistoryQueries");

// Bucketing policy: ranges up to DAILY_BUCKET_LIMIT_DAYS are grouped by day,
// up to WEEKLY_BUCKET_LIMIT_DAYS by week, anything longer by month.
const DAILY_BUCKET_LIMIT_DAYS = 31;
const WEEKLY_BUCKET_LIMIT_DAYS = 180;

async function getSystemActivityChart_controller(req, res, next) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "startDate and endDate are required",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid date format, use YYYY-MM-DD",
      });
    }

    if (start > end) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "startDate must be before endDate",
      });
    }

    const rangeInDays = (end - start) / (1000 * 60 * 60 * 24);

    let granularity = "month";
    let dateFormat = "%Y-%m";
    if (rangeInDays <= DAILY_BUCKET_LIMIT_DAYS) {
      granularity = "day";
      dateFormat = "%Y-%m-%d";
    } else if (rangeInDays <= WEEKLY_BUCKET_LIMIT_DAYS) {
      granularity = "week";
      dateFormat = "%x-W%v";
    }

    const rows = await getSystemActivityChartData(
      startDate,
      `${endDate} 23:59:59`,
      dateFormat,
    );

    // Pivot rows into one chart point per period, one key per eventName
    const chartMap = new Map();
    const seriesMap = new Map();

    for (const row of rows) {
      if (!chartMap.has(row.periodKey)) {
        chartMap.set(row.periodKey, { period: row.periodKey });
      }
      chartMap.get(row.periodKey)[row.eventName] = Number(row.operations);

      if (!seriesMap.has(row.eventName)) {
        seriesMap.set(row.eventName, {
          eventName: row.eventName,
          category: row.category,
          operation: row.operation,
        });
      }
    }

    const series = [...seriesMap.values()];
    const chartData = [...chartMap.values()];

    // Fill missing counts with 0 so every line is continuous
    for (const point of chartData) {
      for (const serie of series) {
        if (point[serie.eventName] === undefined) {
          point[serie.eventName] = 0;
        }
      }
    }

    return res.status(STATUS_CODE.OK).json({
      message: "System activity chart data fetched successfully",
      granularity,
      series,
      chartData,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSystemActivityChart_controller,
};
