import { useState } from "react";
import styles from "./HomeMidCards.module.css";
import HomeMidCardsData from "./HomeMidCardsData";
import { useNotificationContext } from "../../../context/NotificationContext";
import { useActivityContext } from "../../../context/ActivityContext";
import Pagination from "../../Pagination/Pagination";

const HomeMidCards = ({ title }) => {
  const { notifications, markAsRead, loading } = useNotificationContext();
  const { activities, activityLoading } = useActivityContext();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const isActivity = title === "Recent Activity";
  const isLoading = isActivity ? activityLoading : loading;
  const dataList = isActivity ? activities : notifications;

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

  return (
    <div className={styles.HomeMidCards}>
      <h4 className={styles.cardHeaderTitle}>{title}</h4>

      <div className={styles.listContainer}>
        {isLoading ? (
          <p className={styles.emptyMsg}>Loading {title.toLowerCase()}...</p>
        ) : dataList.length === 0 ? (
          <p className={styles.emptyMsg}>
            You don't have {title.toLowerCase()} yet.
          </p>
        ) : (
          currentItems.map((item) => {
            if (isActivity) {
              return (
                <div key={item.logId} className={styles.activityItemWrapper}>
                  <HomeMidCardsData
                    title={item.action}
                    data={item.description}
                    date={item.createdAt}
                  />
                </div>
              );
            } else {
              return (
                <div
                  key={item.notificationId}
                  onClick={() =>
                    !item.isRead && markAsRead(item.notificationId)
                  }
                  className={`${styles.notificationWrapper} ${
                    item.isRead ? styles.read : styles.unread
                  }`}
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
