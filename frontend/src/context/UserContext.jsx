import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const UserContext = createContext();

const UserContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [usersStats, setUsersStats] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState("all");
  const [currentSearch, setCurrentSearch] = useState("");
  const [userChartData, setUserChartData] = useState([]);
  const [userStatsPerEmail, setUserStatsPerEmail] = useState({});
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("session")) loadMe();
    else setIsLoading(false);
  }, []);

  // Function to check if user is already logged in when the app loads
  // The server uses cookies to track sessions, so we just ask for the profile
  async function loadMe() {
    try {
      const res = await axios.get("/users/profile"); // cookies are sent automatically
      setCurrentUser(res.data.user); // User is logged in, save their data
    } catch {
      setCurrentUser(null); // User is not logged in
    } finally {
      setIsLoading(false);
    }
  }

  const login = async (userData) => {
    try {
      const response = await axios.post("/users/login", userData);
      setCurrentUser(response.data);

      if (response.data.role === "user") {
        navigate("/home");
      } else {
        navigate("/dashboard");
      }

      setErrorMsg("");
      localStorage.setItem("session", "true");
    } catch (error) {
      console.log(error?.response.data?.message);
      setErrorMsg(error?.response.data?.message);
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post("/users/register", userData);
      setErrorMsg("");
      setCurrentUser(response.data.user);
      navigate("/home");
      localStorage.setItem("session", "true");
    } catch (error) {
      console.log(error?.response.data?.message);
      setErrorMsg(error?.response.data?.message);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await axios.post("/users/logout", null, {});
      localStorage.clear();
      setCurrentUser(null);
      navigate("/");
      setErrorMsg("");
    } catch (error) {
      console.log(error?.response.data?.message);
      setErrorMsg(error?.response.data?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (newData) => {
    try {
      const res = await axios.put("/users/profile", newData);
      setCurrentUser(res.data.user);
      setErrorMsg("");
      return true;
    } catch (error) {
      console.log(error?.response?.data?.message);
      setErrorMsg(error?.response?.data?.message);
      return false;
    }
  };

  const getUsers = async (page = 1, status = "all", search = "") => {
    try {
      setCurrentStatus(status);
      setCurrentSearch(search);

      let endpoint = "";

      if (status === "all") {
        endpoint = `/users?page=${page}&search=${search}`;
      } else if (status === "admins") {
        endpoint = `/users?page=${page}&search=${search}&role=admin`;
      } else {
        endpoint = `/users/status/${status}?page=${page}&search=${search}`;
      }

      const res = await axios.get(endpoint);
      setAllUsers(res.data.users);
      setPagination(res.data.pagination);
      setUserChartData(res.data.chartData);

      if (res.data.stats) {
        setUsersStats(res.data.stats);
      }

      setErrorMsg("");
      return true;
    } catch (error) {
      console.log(error?.response?.data?.message);
      setErrorMsg(error?.response?.data?.message);
      return false;
    }
  };

  const blockUser = async (email) => {
    try {
      const response = await axios.post(
        `/users/block/${encodeURIComponent(email)}`,
      );
      setErrorMsg("");
      await getUsers(pagination.currentPage || 1, currentStatus, currentSearch);
      if (response.data.emailSent === false) {
        setErrorMsg(response.data.message);
      }
      return response.data;
    } catch (error) {
      const message =
        error?.response?.data?.message || "Failed to block this user.";
      console.log(message);
      setErrorMsg(message);
      return false;
    }
  };

  const unBlockUser = async (email) => {
    try {
      const response = await axios.post(
        `/users/unblock/${encodeURIComponent(email)}`,
      );
      setErrorMsg("");
      await getUsers(pagination.currentPage || 1, currentStatus, currentSearch);
      if (response.data.emailSent === false) {
        setErrorMsg(response.data.message);
      }
      return response.data;
    } catch (error) {
      const message =
        error?.response?.data?.message || "Failed to unblock this user.";
      console.log(message);
      setErrorMsg(message);
      return false;
    }
  };

  const fetchUserStats = async (email, currentPage) => {
    try {
      setIsStatsLoading(true);
      const res = await axios.get(`/users/stats/${encodeURIComponent(email)}`, {
        params: { page: currentPage, limit: 3 },
      });
      setUserStatsPerEmail(res.data);
      setErrorMsg("");
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || "Failed to load user stats.");
    } finally {
      setIsStatsLoading(false);
    }
  };

  // Resolve a public user profile by id (complaint prefill). Returns the user
  // or null when not found / unauthorized.
  const getUserById = async (userId) => {
    try {
      const response = await axios.get(`/users/id/${userId}`);
      setErrorMsg("");
      return response.data.user || null;
    } catch (error) {
      setErrorMsg(error?.response?.data?.message);
      return null;
    }
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        login,
        errorMsg,
        setErrorMsg,
        register,
        logout,
        isLoading,
        updateProfile,
        getUsers,
        allUsers,
        pagination,
        blockUser,
        unBlockUser,
        usersStats,
        userChartData,
        fetchUserStats,
        userStatsPerEmail,
        isStatsLoading,
        getUserById,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
export default UserContextProvider;
