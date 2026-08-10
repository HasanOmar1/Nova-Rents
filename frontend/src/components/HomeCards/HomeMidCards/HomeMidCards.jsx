import { useState } from "react";
import styles from "./HomeMidCards.module.css";
import HomeMidCardsData from "./HomeMidCardsData";
import { useNotificationContext } from "../../../context/NotificationContext";
import { useActivityContext } from "../../../context/ActivityContext";
import Pagination from "../../Pagination/Pagination";
import { useNavigate } from "react-router-dom";

const getNotificationDestination = (notification) => {
  if (notification.type === "owner_report") return "/complaints?view=reports#complaint-history";
  if (notification.type === "vehicle_report") return "/complaints?view=vehicleReports#complaint-history";
  if (notification.type === "complaint_update") return "/complaints?view=history#complaint-history";
  if (notification.type === "complaint_admin") return "/complaintsAdmin";
  if (notification.type === "system" && /complaint/i.test(notification.title || "")) return "/complaintsAdmin";
  if (["rental_request", "rental_approved", "rental_rejected", "rental_cancelled",
    "rental_reminder", "rental_ending_soon", "payment_request", "payment_received",
    "vehicle_maintenance"].includes(notification.type)) return "/rentalDashboard";
  return "/home";
};

const HomeMidCards = ({ title }) => {
  const { notifications, markAsRead, loading } = useNotificationContext();
  const { activities, activityLoading } = useActivityContext();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const itemsPerPage = 3;

  const isActivity = title === "Recent Activity";
  const isLoading = isActivity ? activityLoading : loading;
  const latestActivityId = activities[0]?.logId;
  const [displayedActivityId, setDisplayedActivityId] =
    useState(latestActivityId);

  if (isActivity && latestActivityId !== displayedActivityId) {
    setDisplayedActivityId(latestActivityId);
    setCurrentPage(1);
  }

  // --- NEW: Filter notifications before pagination ---
  let rawDataList = isActivity ? activities : notifications;
  let dataList = rawDataList;

  if (!isActivity) {
    if (filter === "read") {
      dataList = notifications.filter((n) => n.isRead === 1);
    } else if (filter === "unread") {
      dataList = notifications.filter((n) => n.isRead === 0);
    }
  }

  const totalPages = Math.ceil(dataList.length / itemsPerPage);
  const currentItems = dataList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNotificationClick = async (notification) => {
    if (Number(notification.isRead) !== 1) {
      await markAsRead(notification.notificationId);
    }
    navigate(getNotificationDestination(notification));
  };

  return (
    <div className={styles.HomeMidCards}>
      <div className={styles.headerRow}>
        <h4 className={styles.cardHeaderTitle}>{title}</h4>

        {!isActivity && (
          <select
            className={styles.filterSelect}
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        )}
      </div>

      <div className={styles.listContainer}>
        {isLoading ? (
          <p className={styles.emptyMsg}>Loading {title.toLowerCase()}...</p>
        ) : dataList.length === 0 ? (
          <p className={styles.emptyMsg}>
            You don't have any {filter !== "all" && !isActivity ? filter : ""}{" "}
            {title.toLowerCase()} yet.
          </p>
        ) : (
          currentItems.map((item) => {
            if (isActivity) {
              return (
                <div
                  key={item.logId}
                  className={`${styles.activityItemWrapper} `}
                >
                  <HomeMidCardsData
                    title={item.action}
                    data={item.description}
                    date={item.createdAt}
                  />
                </div>
              );
            } else {
              const isComplaintNotification =
                [
                  "owner_report",
                  "vehicle_report",
                  "complaint_update",
                  "complaint_admin",
                ].includes(item.type) ||
                (item.type === "system" &&
                  /complaint|report/i.test(`${item.title || ""} ${item.message || ""}`));
              return (
                <div
                  key={item.notificationId}
                  onClick={() => handleNotificationClick(item)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleNotificationClick(item);
                    }
                  }}
                  className={`${styles.notificationWrapper} ${
                    item.isRead ? styles.read : styles.unread
                  } ${isComplaintNotification ? styles.complaintNotification : ""}`}
                >
                  <HomeMidCardsData
                    title={item.title}
                    data={item.message}
                    date={item.createdAt}
                  />
                  {!item.isRead && <span className={styles.unreadDot}></span>}
                </div>
              );
            }
          })
        )}
      </div>

      {dataList.length > 0 && (
        <div className={styles.paginationWrapper}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            handlePrevPage={handlePrevPage}
            handleNextPage={handleNextPage}
            leftText={`${dataList.length} Total`}
          />
        </div>
      )}
    </div>
  );
};

export default HomeMidCards;
