import axios from "axios";
import { createContext, useContext, useState } from "react";

const GovApisContext = createContext();

const GovApisContextProvider = ({ children }) => {
  const [cities, setCities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const getCities = async () => {
    if (cities.length > 0) return;
    try {
      setIsLoading(true);
      const res = await axios.get("/gov/localities");
      setCities(res.data.data);
    } catch (error) {
      setIsLoading(false);
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GovApisContext.Provider value={{ getCities, cities, isLoading }}>
      {children}
    </GovApisContext.Provider>
  );
};

export const useGovApisContext = () => useContext(GovApisContext);

export default GovApisContextProvider;
