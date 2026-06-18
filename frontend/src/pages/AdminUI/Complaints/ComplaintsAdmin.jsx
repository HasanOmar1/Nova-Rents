import styles from "./ComplaintsAdmin.module.css";
import {
  FileWarning,
  Clock,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import ComplaintsAdminCards from "../../../components/ComplaintsCards/ComplaintsAdminCards";
import { useComplaintContext } from "../../../context/ComplaintContext";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const topData = [
  {
    title: "All",
    value: "2",
    icon: <FileWarning size={28} color="#a7d2eb" />,
  },
  {
    title: "Open",
    value: "1",
    icon: <AlertTriangle size={28} color="#a7d2eb" />,
  },
  {
    title: "Review",
    value: "1",
    icon: <Clock size={28} color="#a7d2eb" />,
  },
];

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
  const [modalStatus, setModalStatus] = useState("open");
  const [adminNote, setAdminNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { putUpdateComplaintStatus, getAllComplaints, complaints } =
    useComplaintContext();

  useEffect(() => {
    getAllComplaints();
  }, []);

  const openReviewModal = (complaint) => {
    setSelectedComplaint(complaint);
    setModalStatus(complaint.status);
    setAdminNote("");
    setSubmitSuccess(false);
  };

  const closeModal = () => {
    setSelectedComplaint(null);
    setAdminNote("");
    setSubmitSuccess(false);
  };

  const handleUpdatestatus = async () => {
    try {
      setIsSubmitting(true);
      const success = await putUpdateComplaintStatus(
        selectedComplaint.complaintId,
        modalStatus,
        adminNote,
      );
      if (success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          closeModal();
        }, 1800);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className={`${styles.ComplaintsAdmin} page`}>
      <h1>Complaints</h1>

      <div className={styles.topCardsContainer}>
        {topData.map((item) => {
          return (
            <HomeTopCards
              key={crypto.randomUUID()}
              title={item.title}
              value={item.value}
              icon={item.icon}
            />
          );
        })}
      </div>

      <div className={styles.searchContainer}>
        <div className={styles.left}>
          <label htmlFor="status">Status</label>
          <select name="status">
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="under-review">Under Review</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div className={styles.right}>
          <label htmlFor="date">From date</label>
          <input type="date" name="date" />
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
        {complaints.map((comp, i) => {
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
                reporter={comp.complainerEmail}
                status={comp.status}
                target={target}
                title={comp.title}
                type={comp.complaintType === "vehicle" ? "Vehicle" : "Owner"}
                onReview={() => openReviewModal(comp)}
              />
              {i < complaints.length - 1 && <hr />}
            </div>
          );
        })}
        <div className={styles.pagination}>
          <p>Showing 1-2 of 2</p>

          <div className={styles.btnsContainer}>
            <button>
              <ChevronLeft size={20} /> Prev
            </button>
            <p>Page 1 / 1</p>
            <button>
              Next <ChevronRight size={20} />
            </button>
          </div>
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
