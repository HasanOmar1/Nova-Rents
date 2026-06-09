import styles from "./HomeMidCards.module.css";
import HomeMidCardsData from "./HomeMidCardsData";
import { useNotificationContext } from "../../../context/NotificationContext";

const activityData = [
  {
    title: "Booking confirmed - BMW 7 Series",
    data: "Today · 9:24",
  },
  {
    title: "Document verification completed",
    data: "Yesterday · 18:40",
  },
  {
    title: "Complaint under review",
    data: "Yesterday · 13:12",
  },
];

const HomeMidCards = ({ title }) => {
  const { notifications, markAsRead, loading } = useNotificationContext();

  const latestNotifications = notifications.slice(0, 3);

  return (
    <div className={styles.HomeMidCards}>
      <h4>{title}</h4>

      {title === "Recent Activity" ? (
        <>
          {activityData.map((item) => {
            return (
              <HomeMidCardsData
                key={item.title}
                title={item.title}
                data={item.data}
              />
            );
          })}
        </>
      ) : (
        <>
          {loading ? (
            <p>Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p>No notifications yet</p>
          ) : (
            latestNotifications.map((notification) => {
              return (
                <div
                  key={notification.notificationId}
                  onClick={() => markAsRead(notification.notificationId)}
                  className={notification.isRead ? styles.read : styles.unread}
                >
                  <HomeMidCardsData
                    title={notification.title}
                    data={notification.message}
                  />
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
};

export default HomeMidCards;
