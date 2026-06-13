import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useUserContext } from "./UserContext";

const ActivityContext = createContext();

const ActivityContextProvider = ({ children }) => {
  const { currentUser } = useUserContext();
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadActivities();
  }, [currentUser]);

  const loadActivities = async () => {
    try {
      setErrorMsg("");
      const activityRes = await axios.get("/activity/my-activity-logs");
      setActivities(activityRes.data.activities || []);
    } catch (error) {
      console.log(error?.response?.data?.message);
      setErrorMsg(
        error?.response?.data?.message || "Failed to fetch activities",
      );
    } finally {
      setActivityLoading(false);
    }
  };

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
