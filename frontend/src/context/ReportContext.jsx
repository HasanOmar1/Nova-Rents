import React, { createContext, useContext, useState } from "react";
import axios from "axios";

const ReportContext = createContext();

const ReportContextProvider = ({ children }) => {
  const [systemActivityData, setSystemActivityData] = useState([]);
  const [systemActivitySeries, setSystemActivitySeries] = useState([]);
  const [systemActivityGranularity, setSystemActivityGranularity] =
    useState("month");
  const [isSystemActivityLoading, setIsSystemActivityLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
