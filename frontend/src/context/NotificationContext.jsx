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
      }, 10000);
      const refreshWhenVisible = () => {
        if (document.visibilityState === "visible") loadNotifications();
      };
      window.addEventListener("focus", refreshWhenVisible);
      document.addEventListener("visibilitychange", refreshWhenVisible);
      return () => {
        clearInterval(intervalId);
        window.removeEventListener("focus", refreshWhenVisible);
        document.removeEventListener("visibilitychange", refreshWhenVisible);
      };
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
    const target = notifications.find(
      (notification) => notification.notificationId === notificationId,
    );
    if (!target || Number(target.isRead) === 1) return true;

    // Update immediately so clicking a notification visibly clears its unread
    // state and badge before navigation changes the page.
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.notificationId === notificationId
          ? { ...notification, isRead: 1 }
          : notification,
      ),
    );
    setUnreadCount((prev) => Math.max(prev - 1, 0));

    try {
      setErrorMsg("");

      await axios.put(`/notifications/mark-notification-as-read/${notificationId}`);
      return true;
    } catch (error) {
      // Restore the unread state when persistence fails.
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.notificationId === notificationId
            ? { ...notification, isRead: 0 }
            : notification,
        ),
      );
      setUnreadCount((prev) => prev + 1);
      console.log(error?.response?.data?.message);
      setErrorMsg(
        error?.response?.data?.message || "Failed to update notification",
      );
      return false;
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
