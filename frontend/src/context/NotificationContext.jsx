import { createContext, useContext, useEffect, useState } from "react";
import { useUserContext } from "./UserContext";
import {
  getMyNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
} from "../api/notificationAPI";

const NotificationContext = createContext();


const NotificationContextProvider = ({ children }) => {
  const { currentUser } = useUserContext();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadNotifications();
    const intervalId = setInterval(() => {
      loadNotifications();
    }, 30000);
    return () => clearInterval(intervalId);
  }, [ currentUser ]);


  const loadNotifications = async () => {
    try {
      setErrorMsg("");
      const notificationResponse = await getMyNotifications();
      const unreadCountResponse = await getUnreadNotificationsCount();
      setNotifications(notificationResponse.notifications || []);
      setUnreadCount(
        unreadCountResponse.unreadCount ||
          unreadCountResponse.count?.unreadCount ||
          0,
      );
    } catch (error) {
       console.log(error?.response.data?.message);
      setErrorMsg(error?.response.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      setErrorMsg("");
      await markNotificationAsRead(notificationId);

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.notificationId === notificationId
            ? { ...notification, isRead: 1 }
            : notification,
        ),
      );

      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (error) {
      console.log(error?.response.data?.message);
      setErrorMsg(error?.response.data?.message);
    }
  };
  

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        errorMsg,
        loadNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
export const useNotificationContext = () => useContext(NotificationContext);

export default NotificationContextProvider;