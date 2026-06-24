import styles from "./ComplaintsAdmin.module.css";
import {
  FileWarning,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  BookCheck,
} from "lucide-react";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import ComplaintsAdminCards from "../../../components/ComplaintsCards/ComplaintsAdminCards";
import { useComplaintContext } from "../../../context/ComplaintContext";
import { useEffect, useState } from "react";
import Pagination from "../../../components/Pagination/Pagination";
import ComplaintReviewModal from "../../../components/ComplaintReviewModal/ComplaintReviewModal";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const lineData = [
  { month: "Jan", cases: 6 },
  { month: "Feb", cases: 9 },
  { month: "Mar", cases: 12 },
  { month: "Apr", cases: 10 },
  { month: "May", cases: 17 },
  { month: "Jun", cases: 20 },
];

const ComplaintsAdmin = () => {
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const {
    putUpdateComplaintStatus,
    getAllComplaints,
    complaints,
    pagination,
    complaintStats,
  } = useComplaintContext();

  // Fetch data when page or filter changes
  useEffect(() => {
    getAllComplaints(currentPage, filterStatus);
  }, [currentPage, filterStatus]);

  // Reset to page 1 if filter changes
  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
    setCurrentPage(1);
  };

  const openReviewModal = (complaint) => {
    setSelectedComplaint(complaint);
    setIsModalOpen(true);
  };

  const closeReviewModal = () => {
    setSelectedComplaint(null);
    setIsModalOpen(false);
  };

  const handleUpdateStatus = async (complaintId, status, adminNote) => {
    const success = await putUpdateComplaintStatus(
      complaintId,
      status,
      adminNote,
    );
    if (success) {
      closeReviewModal();
      getAllComplaints(currentPage, filterStatus);
    }
  };

  const topData = [
    {
      title: "Total Complaints",
      value: complaintStats?.total || 0,
      icon: <FileWarning size={28} color="#a7d2eb" />,
    },
    {
      title: "Open",
      value: complaintStats?.open || 0,
      icon: <AlertTriangle size={28} color="#eab308" />,
    },
    {
      title: "Under Review",
      value: complaintStats?.review || 0,
      icon: <Clock size={28} color="#3b82f6" />,
    },
    {
      title: "Resolved",
      value: complaintStats?.resolved || 0,
      icon: <BookCheck size={28} color="#3b82f6" />,
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
          />
        ))}
      </div>

      <div className={styles.searchContainer}>
        <div className={styles.left}>
          <label htmlFor="status">Status</label>
          <select
            name="status"
            value={filterStatus}
            onChange={handleFilterChange}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in_review">Under Review</option>
            <option value="resolved">Resolved</option>
            {/* <option value="closed">Closed</option> */}
          </select>
        </div>
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
        <hr />

        {complaints.length === 0 ? (
          <p className={styles.emptyMsg}>
            No complaints found for this filter.
          </p>
        ) : (
          complaints.map((comp, i) => {
            const listedOwner =
              comp.complaintType === "vehicle"
                ? `${comp.vehicleOwnerFirstName || ""} ${comp.vehicleOwnerLastName || ""}`
                : `${comp.ownerFirstName || ""} ${comp.ownerLastName || ""}`;

            const target =
              comp.complaintType === "vehicle"
                ? `${comp.brandName || ""} ${comp.modelName || ""} ${comp.vehicleLicensePlate || ""}`
                : `${comp.ownerFirstName || ""} ${comp.ownerLastName || ""}`;

            return (
              <div key={comp.complaintId}>
                <ComplaintsAdminCards
                  action="Review"
                  owner={listedOwner}
                  reporter={comp.complainerEmail || comp.userId}
                  status={comp.status}
                  target={target}
                  title={comp.title}
                  type={comp.complaintType === "vehicle" ? "Vehicle" : "Owner"}
                  onReview={() => openReviewModal(comp)}
                />
                {i < complaints.length - 1 && <hr />}
              </div>
            );
          })
        )}

        <div className={styles.paginationWrapper}>
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            handlePrevPage={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            handleNextPage={() =>
              setCurrentPage((p) => Math.min(p + 1, pagination.totalPages))
            }
            leftText={`Total Complaints: ${pagination.totalComplaints}`}
          />
        </div>
      </div>

      <div className={styles.bottomStats}>
        <h4>Complaint trends</h4>

        <div
          className={styles.stats}
          style={{ height: "300px", marginTop: "20px" }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={lineData}
              margin={{ top: 20, right: 30, left: -30, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#2a2a2a"
              />
              <XAxis
                dataKey="month"
                stroke="#888"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                dy={10}
              />
              <YAxis
                stroke="#888"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                domain={[0, 20]}
                ticks={[0, 5, 10, 15, 20]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e1e1e",
                  borderColor: "#333",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                itemStyle={{ color: "#5494ff" }}
                cursor={{ stroke: "#333", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="cases"
                stroke="#5494ff"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: "#5494ff", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ComplaintsAdmin;
