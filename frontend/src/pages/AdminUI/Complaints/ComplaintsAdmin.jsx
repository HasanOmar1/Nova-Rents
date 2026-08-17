import styles from "./ComplaintsAdmin.module.css";
import { FileWarning, Clock, AlertTriangle, BookCheck } from "lucide-react";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import HomeBottomCards from "../../../components/HomeCards/HomeBottomCards/HomeBottomCards";
import ComplaintsAdminCards from "../../../components/ComplaintsCards/ComplaintsAdminCards";
import { useComplaintContext } from "../../../context/ComplaintContext";
import { useEffect, useState } from "react";
import Pagination from "../../../components/Pagination/Pagination";
import ComplaintReviewModal from "../../../components/ComplaintReviewModal/ComplaintReviewModal";
import {
  formatPeriodTick,
  formatPeriodTooltip,
} from "../../../utils/periodFormat";
import { usePaginatedStatusFilter } from "../../../hooks/usePaginatedStatusFilter";
import { useAppliedDateRange } from "../../../hooks/useAppliedDateRange";

const ComplaintsAdmin = () => {
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    putUpdateComplaintStatus,
    getAllComplaints,
    complaints,
    pagination,
    complaintStats,
    complaintTrendsData,
    isComplaintTrendsLoading,
    complaintTrendsErrorMsg,
    getComplaintTrends,
  } = useComplaintContext();
  const {
    currentPage,
    nextPage,
    previousPage,
    statusFilter,
    handleStatusChange,
  } = usePaginatedStatusFilter({ totalPages: pagination?.totalPages });

  const {
    fromDate,
    toDate,
    setFromDate,
    setToDate,
    isRangeValid,
    appliedFromDate,
    appliedToDate,
    applyDateRange,
  } = useAppliedDateRange();

  // Fetch data when page or filter changes
  useEffect(() => {
    getAllComplaints(currentPage, statusFilter);
  }, [currentPage, statusFilter]);

  // The chart shares the table's status filter but not its pagination,
  // so page changes never refetch or skew the chart totals. It always uses
  // the applied dates, never the in-progress input values.
  useEffect(() => {
    getComplaintTrends(appliedFromDate, appliedToDate, statusFilter);
  }, [statusFilter, appliedFromDate, appliedToDate]);

  const handleApplyDates = () => {
    if (isRangeValid && !isComplaintTrendsLoading) {
      applyDateRange();
    }
  };

  const openReviewModal = (complaint) => {
    setSelectedComplaint(complaint);
    setIsModalOpen(true);
  };

  const closeReviewModal = () => {
    setSelectedComplaint(null);
    setIsModalOpen(false);
  };

  const handleUpdateStatus = async (complaintId, status, payload) => {
    const result = await putUpdateComplaintStatus(complaintId, status, payload);
    if (result) {
      closeReviewModal();
      getAllComplaints(currentPage, statusFilter);
    }
  };

  const topData = [
    {
      title: "Total Complaints",
      value: complaintStats?.total || 0,
      icon: <FileWarning size={28} color="#a7d2eb" />,
      onClick: () => handleStatusChange("all"),
      isAction: true,
    },
    {
      title: "Open",
      value: complaintStats?.open || 0,
      icon: <AlertTriangle size={28} color="#eab308" />,
      onClick: () => handleStatusChange("open"),
      isAction: true,
    },
    {
      title: "Under Review",
      value: complaintStats?.review || 0,
      icon: <Clock size={28} color="#3b82f6" />,
      onClick: () => handleStatusChange("in_review"),
      isAction: true,
    },
    {
      title: "Resolved",
      value: complaintStats?.resolved || 0,
      icon: <BookCheck size={28} color="#3b82f6" />,
      onClick: () => handleStatusChange("resolved"),
      isAction: true,
    },
    {
      title: "Closed",
      value: complaintStats?.closed || 0,
      icon: <BookCheck size={28} color="#3b82f6" />,
      onClick: () => handleStatusChange("closed"),
      isAction: true,
    },
  ];

  return (
    <div className={`${styles.ComplaintsAdmin} page`}>
      <h1>Complaints</h1>

      <ComplaintReviewModal
        isOpen={isModalOpen}
        onClose={closeReviewModal}
        complaint={selectedComplaint}
        onUpdate={handleUpdateStatus}
      />

      <div className={styles.topCardsContainer}>
        {topData.map((item) => (
          <HomeTopCards
            key={crypto.randomUUID()}
            title={item.title}
            value={item.value}
            icon={item.icon}
            onClick={item.onClick}
            isAction={item.isAction}
          />
        ))}
      </div>

      <div className={styles.searchContainer}>
        <div className={styles.filterGroup}>
          <label htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            value={statusFilter}
            onChange={handleStatusChange}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="trendsFromDate">From</label>
          <input
            id="trendsFromDate"
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="trendsToDate">To</label>
          <input
            id="trendsToDate"
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={styles.applyBtn}
          onClick={handleApplyDates}
          disabled={!isRangeValid || isComplaintTrendsLoading}
        >
          {isComplaintTrendsLoading ? "Loading..." : "Apply"}
        </button>
      </div>

      <div className={styles.complaintsContainer}>
        <div className={styles.titles}>
          <p>Type</p>
          <p>Title</p>
          <p>Target</p>
          <p>Listed Owner</p>
          <p>Status</p>
          <p>Reporter</p>
          <p>Action</p>
        </div>

        {complaints.length === 0 ? (
          <p className={styles.emptyMsg}>
            No complaints found for this filter.
          </p>
        ) : (
          complaints.map((comp) => {
            const listedOwner =
              comp.complaintType === "vehicle"
                ? `${comp.vehicleOwnerFirstName || ""} ${comp.vehicleOwnerLastName || ""}`
                : `${comp.ownerFirstName || ""} ${comp.ownerLastName || ""}`;

            const target =
              comp.complaintType === "vehicle"
                ? comp.vehicleLicensePlate || "—"
                : comp.ownerEmail || "—";

            return (
              <div className={styles.complaintRow} key={comp.complaintId}>
                <ComplaintsAdminCards
                  action="Review"
                  owner={listedOwner.trim() || "—"}
                  reporter={comp.complainerEmail || comp.userId || "—"}
                  status={comp.status}
                  target={target}
                  title={comp.title || "Untitled complaint"}
                  type={comp.complaintType === "vehicle" ? "Vehicle" : "Owner"}
                  onReview={() => openReviewModal(comp)}
                />
              </div>
            );
          })
        )}

        <div className={styles.paginationWrapper}>
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            handlePrevPage={previousPage}
            handleNextPage={nextPage}
            leftText={`Total Complaints: ${pagination.totalComplaints}`}
          />
        </div>
      </div>

      <div className={styles.trendsContainer}>
        {complaintTrendsErrorMsg && (
          <p className={styles.trendsError}>{complaintTrendsErrorMsg}</p>
        )}
        <HomeBottomCards
          title={"Complaint trends"}
          subtitle="Complaints submitted during the selected period"
          type="line"
          data={
            complaintTrendsData.some((point) => point.complaints > 0)
              ? complaintTrendsData
              : []
          }
          series={[
            { dataKey: "complaints", name: "Complaints", color: "#5494ff" },
          ]}
          xKey="period"
          xTickFormatter={formatPeriodTick}
          tooltipLabelFormatter={formatPeriodTooltip}
          isLoading={isComplaintTrendsLoading}
          fullWidth
          showLegend={false}
          chartHeight={360}
          emptyMessage="No complaints found for the selected period."
        />
      </div>
    </div>
  );
};

export default ComplaintsAdmin;
