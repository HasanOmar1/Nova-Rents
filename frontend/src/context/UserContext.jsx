import React, { createContext, useContext, useState } from "react";
import axios from "axios";

const UserContext = createContext();

const UserContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const login = async (userData) => {
    try {
      const response = await axios.post("/users/login", userData);
      console.log("logged in successfully", response.data);
      setCurrentUser(response.data);
    } catch (error) {
      console.log(error?.response.data?.message);
      setErrorMsg(error?.response.data?.message);
    }
  };

  return (
    <UserContext.Provider value={{ currentUser, login, errorMsg }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
export default UserContextProvider;
