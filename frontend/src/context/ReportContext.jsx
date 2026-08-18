import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import axios from "axios";

const ReportContext = createContext();

const ReportContextProvider = ({ children }) => {
  const [systemActivityData, setSystemActivityData] = useState([]);
  const [systemActivitySeries, setSystemActivitySeries] = useState([]);
  const [systemActivityGranularity, setSystemActivityGranularity] =
    useState("month");
  const [isSystemActivityLoading, setIsSystemActivityLoading] = useState(false);
  const [statisticsData, setStatisticsData] = useState({
    bookingValue: 0,
    bookings: 0,
    bookingsChartData: [],
  });
  const [statisticsGranularity, setStatisticsGranularity] = useState("month");
  const [isStatisticsLoading, setIsStatisticsLoading] = useState(false);
  const [statisticsErrorMsg, setStatisticsErrorMsg] = useState("");
  const [userDashboardData, setUserDashboardData] = useState({
    earningsTotal: 0,
    earningsChartData: [],
    usageSeries: [],
    usageChartData: [],
  });
  const [userDashboardGranularity, setUserDashboardGranularity] =
    useState("month");
  const [isUserDashboardLoading, setIsUserDashboardLoading] = useState(false);
  const [userDashboardErrorMsg, setUserDashboardErrorMsg] = useState("");
  const [vehicleComparisonData, setVehicleComparisonData] = useState({
    granularity: "month",
    range: { type: "custom", startDate: null, endDate: null },
    series: [],
    chartData: [],
  });
  const [isVehicleComparisonLoading, setIsVehicleComparisonLoading] =
    useState(false);
  const [vehicleComparisonErrorMsg, setVehicleComparisonErrorMsg] =
    useState("");
  const vehicleComparisonRequestId = useRef(0);
  const [errorMsg, setErrorMsg] = useState("");

  // One request feeds every card and chart on the Statistics page so all
  // metrics always describe exactly the same date range.
  const getStatistics = async (startDate, endDate) => {
    try {
      setIsStatisticsLoading(true);
      const response = await axios.get(
        `/reports/statistics?startDate=${startDate}&endDate=${endDate}`,
      );
      setStatisticsData({
        bookingValue: Number(response.data.bookingValue) || 0,
        bookings: Number(response.data.bookings) || 0,
        bookingsChartData: response.data.bookingsChartData || [],
      });
      setStatisticsGranularity(response.data.granularity);
      setStatisticsErrorMsg("");
    } catch (error) {
      setStatisticsErrorMsg(
        error?.response?.data?.message || "Failed to load statistics",
      );
    } finally {
      setIsStatisticsLoading(false);
    }
  };

  // One request feeds both user dashboard charts (Earnings Overview and
  // Platform Usage) so they always describe the same range and granularity.
  // The backend scopes everything to the session user.
  const getUserDashboardReport = async (startDate, endDate) => {
    try {
      setIsUserDashboardLoading(true);
      const response = await axios.get(
        `/reports/user-dashboard?startDate=${startDate}&endDate=${endDate}`,
      );
      setUserDashboardData({
        earningsTotal: Number(response.data.earningsTotal) || 0,
        earningsChartData: response.data.earningsChartData || [],
        usageSeries: response.data.usageSeries || [],
        usageChartData: response.data.usageChartData || [],
      });
      setUserDashboardGranularity(response.data.granularity);
      setUserDashboardErrorMsg("");
    } catch (error) {
      setUserDashboardErrorMsg(
        error?.response?.data?.message || "Failed to load dashboard report",
      );
    } finally {
      setIsUserDashboardLoading(false);
    }
  };

  // Completed-rental value for every vehicle owned by the session user.
  // This is intentionally separate from the paginated My Vehicles request so
  // the comparison always includes the owner's complete vehicle inventory.
  const getVehicleComparison = useCallback(async (options = {}) => {
    const { range = "custom", startDate, endDate } = options;
    const requestId = vehicleComparisonRequestId.current + 1;
    vehicleComparisonRequestId.current = requestId;

    try {
      setIsVehicleComparisonLoading(true);
      setVehicleComparisonErrorMsg("");
      const response = await axios.get("/reports/vehicle-comparison", {
        params:
          range === "all"
            ? { range: "all" }
            : { range: "custom", startDate, endDate },
      });

      if (requestId !== vehicleComparisonRequestId.current) return;

      setVehicleComparisonData({
        granularity: response.data.granularity || "month",
        range: response.data.range || {
          type: range,
          startDate: startDate || null,
          endDate: endDate || null,
        },
        series: response.data.series || [],
        chartData: response.data.chartData || [],
      });
      setVehicleComparisonErrorMsg("");
    } catch (error) {
      if (requestId !== vehicleComparisonRequestId.current) return;

      setVehicleComparisonData({
        granularity: "month",
        range: {
          type: range,
          startDate: startDate || null,
          endDate: endDate || null,
        },
        series: [],
        chartData: [],
      });
      setVehicleComparisonErrorMsg(
        error?.response?.data?.message || "Failed to load vehicle comparison",
      );
    } finally {
      if (requestId === vehicleComparisonRequestId.current) {
        setIsVehicleComparisonLoading(false);
      }
    }
  }, []);

  const getSystemActivityChart = async (startDate, endDate) => {
    try {
      setIsSystemActivityLoading(true);
      const response = await axios.get(
        `/reports/system-activity?startDate=${startDate}&endDate=${endDate}`,
      );
      setSystemActivityData(response.data.chartData);
      setSystemActivitySeries(response.data.series);
      setSystemActivityGranularity(response.data.granularity);
      setErrorMsg("");
    } catch (error) {
      setErrorMsg(error?.response?.data?.message);
    } finally {
      setIsSystemActivityLoading(false);
    }
  };

  return (
    <ReportContext.Provider
      value={{
        systemActivityData,
        systemActivitySeries,
        systemActivityGranularity,
        isSystemActivityLoading,
        statisticsData,
        statisticsGranularity,
        isStatisticsLoading,
        statisticsErrorMsg,
        getStatistics,
        userDashboardData,
        userDashboardGranularity,
        isUserDashboardLoading,
        userDashboardErrorMsg,
        getUserDashboardReport,
        vehicleComparisonData,
        isVehicleComparisonLoading,
        vehicleComparisonErrorMsg,
        getVehicleComparison,
        errorMsg,
        getSystemActivityChart,
      }}
    >
      {children}
    </ReportContext.Provider>
  );
};

export const useReportContext = () => useContext(ReportContext);
export default ReportContextProvider;
