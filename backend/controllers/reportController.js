const STATUS_CODE = require("../constants/statusCodes");
const {
  getSystemActivityChartData,
  getUserActivityChartData,
} = require("../database/queries/systemHistoryQueries");
const {
  getBookingValueByRange,
  getBookingsChartByRange,
  getOwnerEarningsChartByRange,
  getOwnerVehicleEarningsComparisonBounds,
  getOwnerVehicleEarningsComparisonByRange,
} = require("../database/queries/rentalQueries");
const {
  getVehicleComplaintCountsForOwner,
} = require("../database/queries/complaintQueries");
const {
  DAILY_BUCKET_LIMIT_DAYS,
  WEEKLY_BUCKET_LIMIT_DAYS,
  parseLocalDate,
  resolveGranularity,
  buildPeriodKeys,
} = require("../utils/periodBuckets");

const MAX_VEHICLE_COMPARISON_RANGE_DAYS = 3660;

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

// Combined admin statistics for one shared date range. All metrics describe
// the same rental rows: approved + completed booking requests created in the
// range (by createdAt). bookingValue is their gross totalPrice sum — there is
// no commission column, so this is not platform commission revenue.
async function getStatistics_controller(req, res, next) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "startDate and endDate are required",
      });
    }

    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);

    if (!start || !end) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid date format, use YYYY-MM-DD",
      });
    }

    if (start > end) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "startDate must be before endDate",
      });
    }

    const { granularity, dateFormat } = resolveGranularity(start, end);

    const [valueResult, chartRows] = await Promise.all([
      getBookingValueByRange(startDate, endDate),
      getBookingsChartByRange(startDate, endDate, dateFormat),
    ]);

    const countsByPeriod = new Map(
      chartRows.map((row) => [row.periodKey, Number(row.bookings)]),
    );
    const bookingsChartData = buildPeriodKeys(start, end, granularity).map(
      (period) => ({
        period,
        bookings: countsByPeriod.get(period) || 0,
      }),
    );

    // Card total derived from the buckets, so card and chart can never
    // disagree — one query is the single source of truth for both.
    const bookings = bookingsChartData.reduce(
      (sum, point) => sum + point.bookings,
      0,
    );

    return res.status(STATUS_CODE.OK).json({
      message: "Statistics fetched successfully",
      granularity,
      bookingValue: Number(valueResult[0].total) || 0,
      bookings,
      bookingsChartData,
    });
  } catch (error) {
    next(error);
  }
}

// Personal dashboard report: completed-rental earnings for vehicles the
// session user owns, plus the user's own actions from system_history.
// Identity comes only from the session — never from client parameters —
// so a user can never request another user's report.
async function getUserDashboardReport_controller(req, res, next) {
  try {
    const userId = req.session.user.userId;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "startDate and endDate are required",
      });
    }

    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);

    if (!start || !end) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid date format, use YYYY-MM-DD",
      });
    }

    if (start > end) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "startDate must be before endDate",
      });
    }

    const { granularity, dateFormat } = resolveGranularity(start, end);

    const [earningRows, usageRows] = await Promise.all([
      getOwnerEarningsChartByRange(userId, startDate, endDate, dateFormat),
      getUserActivityChartData(userId, startDate, endDate, dateFormat),
    ]);

    // Both charts zero-fill against the same period list so they always
    // cover the identical range at the identical granularity.
    const periods = buildPeriodKeys(start, end, granularity);

    const earningsByPeriod = new Map(
      earningRows.map((row) => [row.periodKey, Number(row.earnings)]),
    );
    const earningsChartData = periods.map((period) => ({
      period,
      earnings: earningsByPeriod.get(period) || 0,
    }));

    // Total derived from the buckets — card and chart can never disagree.
    const earningsTotal = earningsChartData.reduce(
      (sum, point) => sum + point.earnings,
      0,
    );

    // Pivot usage rows into the same contract as the admin System Activity
    // report: one series per eventName, one chart point per period.
    const seriesMap = new Map();
    const usageByPeriod = new Map();

    for (const row of usageRows) {
      if (!seriesMap.has(row.eventName)) {
        seriesMap.set(row.eventName, {
          eventName: row.eventName,
          category: row.category,
          operation: row.operation,
        });
      }
      if (!usageByPeriod.has(row.periodKey)) {
        usageByPeriod.set(row.periodKey, {});
      }
      usageByPeriod.get(row.periodKey)[row.eventName] = Number(row.operations);
    }

    const usageSeries = [...seriesMap.values()];
    const usageChartData = periods.map((period) => {
      const point = { period };
      const counts = usageByPeriod.get(period) || {};
      for (const serie of usageSeries) {
        point[serie.eventName] = counts[serie.eventName] || 0;
      }
      return point;
    });

    return res.status(STATUS_CODE.OK).json({
      message: "User dashboard report fetched successfully",
      granularity,
      earningsTotal,
      earningsChartData,
      usageSeries,
      usageChartData,
    });
  } catch (error) {
    next(error);
  }
}

// Compares completed-rental value and count across every vehicle owned by the
// authenticated user. Both metrics use rental endDate, matching the personal
// dashboard's definition of when a rental is earned.
async function getVehicleComparison_controller(req, res, next) {
  try {
    const userId = req.session.user.userId;
    const {
      startDate: requestedStartDate,
      endDate: requestedEndDate,
      range: requestedRange,
    } = req.query;

    if (requestedRange && !["all", "custom"].includes(requestedRange)) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "range must be either all or custom",
      });
    }

    const isAllTime = requestedRange === "all";
    if (
      isAllTime &&
      (requestedStartDate !== undefined || requestedEndDate !== undefined)
    ) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Do not send startDate or endDate when range is all",
      });
    }

    let effectiveStartDate = requestedStartDate || null;
    let effectiveEndDate = requestedEndDate || null;
    let start = null;
    let end = null;
    let granularity;
    let dateFormat;

    if (isAllTime) {
      const [bounds] =
        await getOwnerVehicleEarningsComparisonBounds(userId);
      effectiveStartDate = bounds?.startDate || null;
      effectiveEndDate = bounds?.endDate || null;

      if (effectiveStartDate && effectiveEndDate) {
        start = parseLocalDate(effectiveStartDate);
        end = parseLocalDate(effectiveEndDate);

        if (!start || !end) {
          throw new Error(
            "Invalid vehicle comparison bounds returned by database",
          );
        }

        const rangeInDays = (end - start) / (1000 * 60 * 60 * 24);
        if (rangeInDays > MAX_VEHICLE_COMPARISON_RANGE_DAYS) {
          granularity = "year";
          dateFormat = "%Y";
        } else {
          ({ granularity, dateFormat } = resolveGranularity(start, end));
        }
      } else {
        granularity = "month";
        dateFormat = "%Y-%m";
      }
    } else {
      if (!requestedStartDate || !requestedEndDate) {
        return res.status(STATUS_CODE.BAD_REQUEST).json({
          message: "startDate and endDate are required",
        });
      }

      start = parseLocalDate(requestedStartDate);
      end = parseLocalDate(requestedEndDate);

      if (!start || !end) {
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
      if (rangeInDays > MAX_VEHICLE_COMPARISON_RANGE_DAYS) {
        return res.status(STATUS_CODE.BAD_REQUEST).json({
          message: "Vehicle comparison date range cannot exceed 10 years",
        });
      }

      ({ granularity, dateFormat } = resolveGranularity(start, end));
    }

    const [rows, vehicleReportRows] = await Promise.all([
      getOwnerVehicleEarningsComparisonByRange(
        userId,
        effectiveStartDate,
        effectiveEndDate,
        dateFormat,
      ),
      getVehicleComplaintCountsForOwner(userId),
    ]);

    const reportCountByPlate = new Map(
      vehicleReportRows.map((row) => [
        String(row.licensePlate),
        Number(row.reportCount) || 0,
      ]),
    );

    const seriesMap = new Map();
    const earningsByPeriod = new Map();

    for (const row of rows) {
      const licensePlate = String(row.licensePlate);
      const dataKey = `vehicle_${licensePlate}`;

      if (!seriesMap.has(dataKey)) {
        seriesMap.set(dataKey, {
          dataKey,
          licensePlate,
          name: `${row.brandName} ${row.modelName} (${licensePlate})`,
          reportCount: reportCountByPlate.get(licensePlate) || 0,
          rentalCount: 0,
        });
      }

      seriesMap.get(dataKey).rentalCount += Number(row.rentalCount) || 0;

      if (row.periodKey) {
        if (!earningsByPeriod.has(row.periodKey)) {
          earningsByPeriod.set(row.periodKey, {});
        }
        earningsByPeriod.get(row.periodKey)[dataKey] =
          Number(row.earnings) || 0;
      }
    }

    const series = [...seriesMap.values()];
    const periods =
      start && end ? buildPeriodKeys(start, end, granularity) : [];
    const chartData = periods.map((period) => {
      const point = { period };
      const periodEarnings = earningsByPeriod.get(period) || {};

      for (const vehicle of series) {
        point[vehicle.dataKey] = periodEarnings[vehicle.dataKey] || 0;
      }

      return point;
    });

    return res.status(STATUS_CODE.OK).json({
      message: "Vehicle comparison fetched successfully",
      range: {
        type: isAllTime ? "all" : "custom",
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
      },
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
  getStatistics_controller,
  getUserDashboardReport_controller,
  getVehicleComparison_controller,
};
