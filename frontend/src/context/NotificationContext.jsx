import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useUserContext } from "./UserContext";

const NotificationContext = createContext();

const NotificationContextProvider = ({ children }) => {
  const { currentUser } = useUserContext();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      const intervalId = setInterval(() => {
        loadNotifications();
      }, 30000);
      return () => clearInterval(intervalId);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }
  }, [currentUser]);

  const loadNotifications = async () => {
    try {
      setErrorMsg("");
      const [notificationRes, unreadRes] = await Promise.all([
        axios.get("/notifications/my-notifications"),
        axios.get("/notifications/unread-notifications-count"),
      ]);
      setNotifications(notificationRes.data.notifications || []);
      setUnreadCount(
        unreadRes.data.unreadCount || unreadRes.data.count?.unreadCount || 0,
      );
    } catch (error) {
      console.log(error?.response?.data?.message);
      setErrorMsg(
        error?.response?.data?.message || "Failed to fetch notifications",
      );
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      setErrorMsg("");

      await axios.put(
        `/notifications/mark-notification-as-read/${notificationId}`,
        {
          withCredentials: true,
        },
      );

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.notificationId === notificationId
            ? { ...notification, isRead: 1 }
            : notification,
        ),
      );

      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (error) {
      console.log(error?.response?.data?.message);
      setErrorMsg(
        error?.response?.data?.message || "Failed to update notification",
      );
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
