// Provides shared notification state and API operations through React context.
// It exports a provider component and a hook for consuming the managed data.
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

// Supplies notification state and read actions to descendant components.
// Accepts children and returns a notification-context provider tree.
const NotificationContextProvider = ({ children }) => {
  const { currentUser } = useUserContext();
  const activeUserId = currentUser?.userId ?? null;
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const activeUserIdRef = useRef(activeUserId);
  const requestControllerRef = useRef(null);

  // Loads notifications into the relevant application state.
  // Takes no arguments and returns a promise for the operation result.
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

  useEffect(
    // Synchronizes the component with an external effect after rendering.
    // Takes no arguments and returns an optional cleanup function.
    () => {
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

      // Synchronizes the component with an external effect after rendering.
      // Takes no arguments and returns an optional cleanup function.
      return () => {
        requestControllerRef.current?.abort();
      };
    }, [activeUserId]);

  useVisibilityPolling(loadNotifications, {
    enabled: Boolean(activeUserId),
    intervalMs: 10000,
    refreshKey: activeUserId,
  });

  // Marks as read in the managed state.
  // Accepts notification id and returns a promise for the operation result.
  const markAsRead = async (notificationId) => {
    const target = notifications.find(
      // Tests whether one collection entry is the requested match.
      // Accepts notification and returns a Boolean match result.
      (notification) => notification.notificationId === notificationId,
    );
    if (!target || Number(target.isRead) === 1) return true;

    // Prevent an older list request from replacing this optimistic update.
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;

    // Update immediately so clicking a notification visibly clears its unread
    // state and badge before navigation changes the page.
    setNotifications(
      // Derives the next state value from the current state.
      // Accepts prev and returns the updated state value.
      (prev) =>
      prev.map(
        // Transforms one collection entry for the resulting list.
        // Accepts notification and returns the mapped entry.
        (notification) =>
        notification.notificationId === notificationId
          ? { ...notification, isRead: 1 }
          : notification,
      ),
    );
    setUnreadCount(
      // Derives the next state value from the current state.
      // Accepts prev and returns the updated state value.
      (prev) => Math.max(prev - 1, 0));

    try {
      setErrorMsg("");

      await axios.put(`/notifications/mark-notification-as-read/${notificationId}`);
      return true;
    } catch (error) {
      // Restore the unread state when persistence fails.
      setNotifications(
        // Derives the next state value from the current state.
        // Accepts prev and returns the updated state value.
        (prev) =>
        prev.map(
          // Transforms one collection entry for the resulting list.
          // Accepts notification and returns the mapped entry.
          (notification) =>
          notification.notificationId === notificationId
            ? { ...notification, isRead: 0 }
            : notification,
        ),
      );
      setUnreadCount(
        // Derives the next state value from the current state.
        // Accepts prev and returns the updated state value.
        (prev) => prev + 1);
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
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Reads notification state and actions exposed by the nearest provider.
// Takes no arguments and returns the current notification context value.
export const useNotificationContext = () => useContext(NotificationContext);

export default NotificationContextProvider;
