// Provides shared activity state and API operations through React context.
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

const ActivityContext = createContext();

// Supplies recent activity state and refresh behavior to descendant components.
// Accepts children and returns an activity-context provider tree.
const ActivityContextProvider = ({ children }) => {
  const { currentUser } = useUserContext();
  const activeUserId = currentUser?.userId ?? null;
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const activeUserIdRef = useRef(activeUserId);
  const requestControllerRef = useRef(null);

  // Loads activities into the relevant application state.
  // Takes no arguments and returns a promise for the operation result.
  const loadActivities = useCallback(async () => {
    const requestedUserId = activeUserIdRef.current;
    if (!requestedUserId) return false;

    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      setErrorMsg("");
      const activityRes = await axios.get("/activity/my-activity-logs", {
        signal: controller.signal,
      });

      if (
        controller.signal.aborted ||
        activeUserIdRef.current !== requestedUserId
      ) {
        return false;
      }

      setActivities(activityRes.data.activities || []);
      return true;
    } catch (error) {
      if (controller.signal.aborted) return false;

      console.log(error?.response?.data?.message);
      setErrorMsg(
        error?.response?.data?.message || "Failed to fetch activities",
      );
      return false;
    } finally {
      if (
        requestControllerRef.current === controller &&
        activeUserIdRef.current === requestedUserId
      ) {
        requestControllerRef.current = null;
        setActivityLoading(false);
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
        setActivities([]);
        setErrorMsg("");
        setActivityLoading(false);
        return;
      }

      setActivityLoading(true);

      // Synchronizes the component with an external effect after rendering.
      // Takes no arguments and returns an optional cleanup function.
      return () => {
        requestControllerRef.current?.abort();
      };
    }, [activeUserId]);

  useVisibilityPolling(loadActivities, {
    enabled: Boolean(activeUserId),
    intervalMs: 15000,
    refreshKey: activeUserId,
  });

  return (
    <ActivityContext.Provider
      value={{
        activities,
        activityLoading,
        errorMsg,
        loadActivities,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
};

// Reads recent-activity state and refresh controls from the nearest provider.
// Takes no arguments and returns the current activity context value.
export const useActivityContext = () => useContext(ActivityContext);

export default ActivityContextProvider;
