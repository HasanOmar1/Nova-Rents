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

const ActivityContext = createContext();

const ActivityContextProvider = ({ children }) => {
  const { currentUser } = useUserContext();
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const activeUserIdRef = useRef(currentUser?.userId ?? null);
  const requestControllerRef = useRef(null);

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

  useEffect(() => {
    const activeUserId = currentUser?.userId ?? null;
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
    loadActivities();

    const intervalId = setInterval(loadActivities, 15000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        loadActivities();
      }
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      requestControllerRef.current?.abort();
      clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [currentUser?.userId, loadActivities]);

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

export const useActivityContext = () => useContext(ActivityContext);

export default ActivityContextProvider;
