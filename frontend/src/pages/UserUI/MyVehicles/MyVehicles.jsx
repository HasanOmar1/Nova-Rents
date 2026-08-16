import { useState, useEffect, useMemo } from "react";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import VehiclesCardsTable from "../../../components/VehiclesCardsTable/VehiclesCardsTable";
import styles from "./MyVehicles.module.css";
import {
  Car,
  CircleDollarSign,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { useVehicleContext } from "../../../context/VehicleContext";
import { useComplaintContext } from "../../../context/ComplaintContext";
import AddEditVehicleMenu from "../../../components/AddEditVehicleMenu/AddEditVehicleMenu";
import OwnerVehicleReportsModal from "../../../components/OwnerVehicleReportsModal/OwnerVehicleReportsModal";
import Pagination from "../../../components/Pagination/Pagination";
import HomeBottomCards from "../../../components/HomeCards/HomeBottomCards/HomeBottomCards";
import { useReportContext } from "../../../context/ReportContext";
import {
  formatPeriodTick,
  formatPeriodTooltip,
} from "../../../utils/periodFormat";

const getVehicleChartColor = (index) => {
  const hue = Math.round((205 + index * 137.508) % 360);
  return `hsl(${hue}, 72%, 66%)`;
};

const formatDateForInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createDefaultComparisonRange = () => {
  const today = new Date();
  const firstMonthInRange = new Date(
    today.getFullYear(),
    today.getMonth() - 5,
    1,
  );

  return {
    from: formatDateForInput(firstMonthInRange),
    to: formatDateForInput(today),
  };
};

const formatCurrency = (value) =>
  `$${(Number(value) || 0).toLocaleString()}`;

const MyVehicles = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedVehicleForReports, setSelectedVehicleForReports] =
    useState(null);
  const [defaultComparisonRange] = useState(createDefaultComparisonRange);
  const [fromDate, setFromDate] = useState(defaultComparisonRange.from);
  const [toDate, setToDate] = useState(defaultComparisonRange.to);
  const [appliedFromDate, setAppliedFromDate] = useState(
    defaultComparisonRange.from,
  );
  const [appliedToDate, setAppliedToDate] = useState(defaultComparisonRange.to);

  const {
    getUserVehicles,
    userVehicles,
    vehicleStats,
    pagination,
    vehicleInventoryVersion,
  } = useVehicleContext();
  const { ownerVehicleReports, getOwnerVehicleReports } = useComplaintContext();
  const {
    vehicleComparisonData,
    isVehicleComparisonLoading,
    vehicleComparisonErrorMsg,
    getVehicleComparison,
  } = useReportContext();

  const isComparisonRangeValid = Boolean(
    fromDate && toDate && fromDate <= toDate,
  );

  useEffect(() => {
    getUserVehicles(currentPage, statusFilter);
  }, [currentPage, statusFilter]);

  useEffect(() => {
    getOwnerVehicleReports();
  }, []);

  useEffect(() => {
    getVehicleComparison(appliedFromDate, appliedToDate);
  }, [
    appliedFromDate,
    appliedToDate,
    getVehicleComparison,
    vehicleInventoryVersion,
  ]);

  const reportsByPlate = useMemo(() => {
    const map = new Map();
    for (const report of ownerVehicleReports) {
      const key = String(report.vehicleLicensePlate);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(report);
    }
    return map;
  }, [ownerVehicleReports]);

  const selectedReports = selectedVehicleForReports
    ? reportsByPlate.get(String(selectedVehicleForReports.licensePlate)) || []
    : [];

  const selectedVehicleLabel = selectedVehicleForReports
    ? `${selectedVehicleForReports.brandName} ${selectedVehicleForReports.modelName}`
    : "";

  const comparisonSeries = useMemo(
    () =>
      vehicleComparisonData.series.map((serie, index) => ({
        dataKey: serie.dataKey,
        name: serie.name || String(serie.licensePlate),
        color: getVehicleChartColor(index),
      })),
    [vehicleComparisonData.series],
  );

  const comparisonChartData = useMemo(
    () =>
      vehicleComparisonData.chartData.map((point) => {
        const normalizedPoint = { ...point };

        for (const serie of comparisonSeries) {
          normalizedPoint[serie.dataKey] =
            Number(normalizedPoint[serie.dataKey]) || 0;
        }

        return normalizedPoint;
      }),
    [comparisonSeries, vehicleComparisonData.chartData],
  );

  const hasComparisonValue = comparisonChartData.some((point) =>
    comparisonSeries.some((serie) => point[serie.dataKey] > 0),
  );

  const comparisonEmptyMessage = vehicleComparisonErrorMsg
    ? "The vehicle comparison is unavailable right now."
    : comparisonSeries.length
      ? "No completed rental value was found for your vehicles in the selected period."
      : "Add a vehicle to start comparing completed rental value.";

  useEffect(() => {
    if (pagination?.totalPages && currentPage > pagination.totalPages) {
      setCurrentPage(pagination.totalPages || 1);
    }
  }, [pagination?.totalPages, currentPage]);

  const openAddVehMenu = () => setIsOpen(true);
  const closeAddVehMenu = () => setIsOpen(false);

  const handleStatusChange = (valueOrEvent) => {
    const status = valueOrEvent?.target
      ? valueOrEvent.target.value
      : valueOrEvent;

    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleApplyComparisonDates = () => {
    if (isComparisonRangeValid && !isVehicleComparisonLoading) {
      if (fromDate === appliedFromDate && toDate === appliedToDate) {
        getVehicleComparison(fromDate, toDate);
        return;
      }

      setAppliedFromDate(fromDate);
      setAppliedToDate(toDate);
    }
  };

  const handleNextPage = () => {
    if (pagination?.currentPage < pagination?.totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (pagination?.currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const topData = [
    {
      title: "Vehicles Count",
      value: vehicleStats?.allVehicles || 0,
      icon: <Car size={28} color="#a7d2eb" />,
      onClick: () => handleStatusChange("all"),
      isAction: true,
    },
    {
      title: "Available Now",
      value: vehicleStats?.availableNow || 0,
      icon: <ShieldCheck size={28} color="#a7d2eb" />,
      isAction: true,
      onClick: () => handleStatusChange("available"),
    },
    {
      title: "Under Maintenance",
      value: vehicleStats?.maintenance || 0,
      icon: <ShieldAlert size={28} color="#a7d2eb" />,
      isAction: true,
      onClick: () => handleStatusChange("maintenance"),
    },
    {
      title: "Inactive",
      value: vehicleStats?.inactive || 0,
      icon: <ShieldOff size={28} color="#a7d2eb" />,
      isAction: true,
      onClick: () => handleStatusChange("inactive"),
    },
    {
      title: "Avg. daily rate",
      value: `$${(vehicleStats?.avgRate || 0).toLocaleString()}`,
      icon: <CircleDollarSign size={28} color="#a7d2eb" />,
    },
  ];

  return (
    <div className={`${styles.MyVehicles} page`}>
      <h1>My vehicles</h1>

      <div className={styles.headerControls}>
        <div className={styles.headerLeft}>
          <p>Your listings only — add, edit, or remove vehicles.</p>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.filterContainer}>
            <label htmlFor="status">Filter:</label>
            <select
              name="status"
              value={statusFilter}
              onChange={handleStatusChange}
            >
              <option value="all">All Vehicles</option>
              <option value="available">Available</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <button className={styles.addVehicleBtn} onClick={openAddVehMenu}>
            Add vehicle
          </button>
        </div>
      </div>

      <div className={styles.topCardsContainer}>
        {topData.map((item) => (
          <HomeTopCards
            key={item.title}
            title={item.title}
            value={item.value}
            icon={item.icon}
            onClick={item.onClick}
            isAction={item.isAction}
          />
        ))}
      </div>

      <div className={styles.comparisonSection}>
        <div className={styles.chartFilters}>
          <div className={styles.dateField}>
            <label htmlFor="vehicleComparisonFromDate">From</label>
            <input
              id="vehicleComparisonFromDate"
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>

          <div className={styles.dateField}>
            <label htmlFor="vehicleComparisonToDate">To</label>
            <input
              id="vehicleComparisonToDate"
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>

          <button
            type="button"
            className={styles.applyDatesBtn}
            onClick={handleApplyComparisonDates}
            disabled={!isComparisonRangeValid || isVehicleComparisonLoading}
          >
            {isVehicleComparisonLoading ? "Loading..." : "Apply"}
          </button>
        </div>

        {!isComparisonRangeValid && (
          <p className={styles.chartError} role="alert">
            Choose a From date that is on or before the To date.
          </p>
        )}

        {vehicleComparisonErrorMsg && (
          <p className={styles.chartError} role="alert">
            {vehicleComparisonErrorMsg}
          </p>
        )}

        <HomeBottomCards
          title="Completed Rental Value by Vehicle"
          subtitle="Completed rental value for all your vehicles, grouped by rental end date"
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
          chartHeight={340}
        />
      </div>

      <div className={styles.myVehiclesContainer}>
        <div className={styles.titles}>
          <p className={styles.vehicleTitle}>Vehicle</p>
          <p>Category</p>
          <p>Address</p>
          <p>Price</p>
          <p>Status</p>
          <p>Actions</p>
        </div>
        <hr />

        {userVehicles?.length ? (
          <>
            {userVehicles.map((veh, i) => (
              <div key={veh.licensePlate}>
                <VehiclesCardsTable
                  veh={veh}
                  activeReportCount={
                    reportsByPlate.get(String(veh.licensePlate))?.length || 0
                  }
                  onViewReports={setSelectedVehicleForReports}
                />
                {i < userVehicles.length - 1 && <hr />}
              </div>
            ))}

            <Pagination
              currentPage={pagination?.currentPage}
              totalPages={pagination?.totalPages}
              handlePrevPage={handlePrevPage}
              handleNextPage={handleNextPage}
              leftText={`Total Vehicles: ${pagination?.totalVehicles || 0}`}
            />
          </>
        ) : (
          <p className={styles.noVehicles}>
            No vehicles found for this status.
          </p>
        )}
      </div>

      <AddEditVehicleMenu isOpen={isOpen} onClose={closeAddVehMenu} />

      <OwnerVehicleReportsModal
        isOpen={Boolean(selectedVehicleForReports)}
        onClose={() => setSelectedVehicleForReports(null)}
        vehicleLabel={selectedVehicleLabel}
        reports={selectedReports}
      />
    </div>
  );
};

export default MyVehicles;
