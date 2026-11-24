// Provides shared gov apis state and API operations through React context.
// It exports a provider component and a hook for consuming the managed data.
import axios from "axios";
import { createContext, useContext, useState } from "react";

const GovApisContext = createContext();

// Supplies government API lookup data and actions to descendant components.
// Accepts children and returns a government-API context provider tree.
const GovApisContextProvider = ({ children }) => {
  const [cities, setCities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Retrieves cities for the current workflow.
  // Takes no arguments and returns a promise for the operation result.
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

// Reads government API data and actions exposed by the nearest provider.
// Takes no arguments and returns the current government-API context value.
export const useGovApisContext = () => useContext(GovApisContext);

export default GovApisContextProvider;
