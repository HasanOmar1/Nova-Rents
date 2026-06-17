import React, { createContext, useContext, useState } from "react";
import axios from "axios";

const ComplaintContext = createContext();

const ComplaintContextProvider = ({ children }) => {
  const [complaints, setComplaints] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const createComplaint = async (complaintData) => {
    try {
      await axios.post("/complaints", complaintData);
      setErrorMsg("");
      return true;
    } catch (error) {
      setErrorMsg(error?.response?.data?.message);
      return false;
    }
  };

  const getMyComplaints = async () => {
    try {
      const response = await axios.get("/complaints/my");
      setComplaints(response.data.complaints);
      setErrorMsg("");
    } catch (error) {
      setErrorMsg(error?.response?.data?.message);
    }
  };

  return (
    <ComplaintContext.Provider
      value={{
        complaints,
        errorMsg,
        setErrorMsg,
        createComplaint,
        getMyComplaints,
      }}
    >
      {children}
    </ComplaintContext.Provider>
  );
};

export const useComplaintContext = () => useContext(ComplaintContext);
export default ComplaintContextProvider;
