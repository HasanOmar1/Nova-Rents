import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { useUserContext } from "./UserContext";
import { useVisibilityPolling } from "../hooks/useVisibilityPolling";

const NotificationContext = createContext();

const NotificationContextProvider = ({ children }) => {
  const { currentUser } = useUserContext();
  const activeUserId = currentUser?.userId ?? null;
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const activeUserIdRef = useRef(activeUserId);
  const requestControllerRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    const requestedUserId = activeUserIdRef.current;
    if (!requestedUserId) return false;

    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      setErrorMsg("");
      const [notificationRes, unreadRes] = await Promise.all([
        axios.get("/notifications/my-notifications", {
          signal: controller.signal,
        }),
        axios.get("/notifications/unread-notifications-count", {
          signal: controller.signal,
        }),
      ]);

      if (
        controller.signal.aborted ||
        activeUserIdRef.current !== requestedUserId
      ) {
        return false;
      }

      setNotifications(notificationRes.data.notifications || []);
      setUnreadCount(
        unreadRes.data.unreadCount || unreadRes.data.count?.unreadCount || 0,
      );
      return true;
    } catch (error) {
      if (controller.signal.aborted) return false;

      console.log(error?.response?.data?.message);
      setErrorMsg(
        error?.response?.data?.message || "Failed to fetch notifications",
      );
      return false;
    } finally {
      if (
        requestControllerRef.current === controller &&
        activeUserIdRef.current === requestedUserId
      ) {
        requestControllerRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    activeUserIdRef.current = activeUserId;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;

    if (!activeUserId) {
      setNotifications([]);
      setUnreadCount(0);
      setErrorMsg("");
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    return () => {
      requestControllerRef.current?.abort();
    };
  }, [activeUserId]);

  useVisibilityPolling(loadNotifications, {
    enabled: Boolean(activeUserId),
    intervalMs: 10000,
    refreshKey: activeUserId,
  });

  const markAsRead = async (notificationId) => {
    const target = notifications.find(
      (notification) => notification.notificationId === notificationId,
    );
    if (!target || Number(target.isRead) === 1) return true;

    // Prevent an older list request from replacing this optimistic update.
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;

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
