// Defines the Home Mid Cards React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import { useState } from "react";
import styles from "./HomeMidCards.module.css";
import HomeMidCardsData from "./HomeMidCardsData";
import { useNotificationContext } from "../../../context/NotificationContext";
import { useActivityContext } from "../../../context/ActivityContext";
import Pagination from "../../Pagination/Pagination";
import { useNavigate } from "react-router-dom";
import { useClientPagination } from "../../../hooks/useClientPagination";

// Retrieves notification destination for the current workflow.
// Accepts notification and returns the computed result.
const getNotificationDestination = (notification) => {
  if (notification.type === "owner_report") return "/complaints?view=reports#complaint-history";
  if (notification.type === "vehicle_report") return "/complaints?view=vehicleReports#complaint-history";
  if (notification.type === "complaint_update") return "/complaints?view=history#complaint-history";
  if (notification.type === "complaint_admin") return "/complaintsAdmin";
  if (notification.type === "document_update") return "/profile";
  if (notification.type === "document_admin") return "/documentsAdmin";
  if (notification.type === "system" && /complaint/i.test(notification.title || "")) return "/complaintsAdmin";
  if (["rental_request", "rental_approved", "rental_rejected", "rental_cancelled",
    "rental_reminder", "rental_ending_soon", "payment_request", "payment_received",
    "vehicle_maintenance"].includes(notification.type)) return "/rentalDashboard";
  return "/home";
};

// Renders the Home Mid Cards interface.
// Accepts an options object and returns rendered JSX.
const HomeMidCards = ({ title }) => {
  const { notifications, markAsRead, loading } = useNotificationContext();
  const { activities, activityLoading } = useActivityContext();
  const navigate = useNavigate();

  const [filter, setFilter] = useState("all");

  const isActivity = title === "Recent Activity";
  const isLoading = isActivity ? activityLoading : loading;
  const latestActivityId = activities[0]?.logId;

  // --- NEW: Filter notifications before pagination ---
  let rawDataList = isActivity ? activities : notifications;
  let dataList = rawDataList;

  if (!isActivity) {
    if (filter === "read") {
      dataList = notifications.filter(
        // Tests whether one collection entry belongs in the filtered result.
        // Accepts n and returns a Boolean inclusion result.
        (n) => n.isRead === 1);
    } else if (filter === "unread") {
      dataList = notifications.filter(
        // Tests whether one collection entry belongs in the filtered result.
        // Accepts n and returns a Boolean inclusion result.
        (n) => n.isRead === 0);
    }
  }

  const {
    currentPage,
    nextPage,
    paginatedItems: currentItems,
    previousPage,
    totalPages,
  } = useClientPagination({
    items: dataList,
    pageSize: 3,
    resetKey: isActivity
      ? `activity:${latestActivityId ?? ""}`
      : `notifications:${filter}`,
  });

  // Handles notification click for the surrounding interface.
  // Accepts notification and returns a promise for the operation result.
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
            onChange={
              // Handles the component's change event.
              // Accepts e and returns the handler result.
              (e) => {
                setFilter(e.target.value);
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
          currentItems.map(
            // Transforms one collection entry for the resulting list.
            // Accepts item and returns the mapped entry.
            (item) => {
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
                    onClick={
                      // Handles the component's click event.
                      // Takes no arguments and returns the handler result.
                      () => handleNotificationClick(item)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={
                      // Handles the component's key down event.
                      // Accepts event and returns the handler result.
                      (event) => {
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
            handlePrevPage={previousPage}
            handleNextPage={nextPage}
            leftText={`${dataList.length} Total`}
          />
        </div>
      )}
    </div>
  );
};

export default HomeMidCards;
