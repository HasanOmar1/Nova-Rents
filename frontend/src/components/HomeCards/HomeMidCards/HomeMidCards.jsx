import styles from "./HomeMidCards.module.css";
import HomeMidCardsData from "./HomeMidCardsData";
import { useNotificationContext } from "../../../context/NotificationContext";
import { useActivityContext } from "../../../context/ActivityContext";


const HomeMidCards = ({ title }) => {
  const { notifications, markAsRead, loading } = useNotificationContext();
  const { activities,activityLoading } = useActivityContext();
  const latestNotifications = notifications.slice(0, 3);

  return (
    <div className={styles.HomeMidCards}>
      <h4>{title}</h4>

      {title === "Recent Activity" ? (
        <>
          {activityLoading ? (
            <p>Loading activities...</p>
          ) : activities.length === 0 ? (
            <p className={styles.noActivitiesMsg}>
              You dont have activities yet
            </p>
          ) : activities.map((item) => {
            return (
              <HomeMidCardsData
                key={item.logId}
                title={item.action}
                data={item.description}
                date={item.createdAt}
              />
            );
          })}
        </>
      ) : (
        <>
          {loading ? (
            <p>Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className={styles.noNotificationsMsg}>
              You dont have notifications yet
            </p>
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
