import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const UserContext = createContext();

const UserContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("session")) loadMe();
  }, []);

  // Function to check if user is already logged in when the app loads
  // The server uses cookies to track sessions, so we just ask for the profile
  async function loadMe() {
    try {
      const res = await axios.get("/users/profile"); // cookies are sent automatically
      setCurrentUser(res.data.user); // User is logged in, save their data
    } catch {
      setCurrentUser(null); // User is not logged in
    }
  }

  const login = async (userData) => {
    try {
      const response = await axios.post("/users/login", userData);
      console.log("logged in successfully", response.data);
      setCurrentUser(response.data);
      navigate("/home");
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
    try {
      await axios.post("/users/logout", null, {});
      setCurrentUser(null);
      setErrorMsg("");
      localStorage.clear();
    } catch (error) {
      console.log(error?.response.data?.message);
      setErrorMsg(error?.response.data?.message);
    }
  };

  return (
    <UserContext.Provider
      value={{ currentUser, login, errorMsg, setErrorMsg, register, logout }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
export default UserContextProvider;
