// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import UserContextProvider from "./context/UserContext.jsx";
import VehicleContextProvider from "./context/VehicleContext.jsx";
import NotificationContextProvider from "./context/NotificationContext.jsx";
import RentContextProvider from "./context/RentContext.jsx";
import GovApisContextProvider from "./context/GovApisContext.jsx";

axios.defaults.baseURL = "http://localhost:3000";
axios.defaults.withCredentials = true;

createRoot(document.getElementById("root")).render(
  // <StrictMode>
  <BrowserRouter>
    <VehicleContextProvider>
      <UserContextProvider>
        <RentContextProvider>
          <NotificationContextProvider>
            <GovApisContextProvider>
              <App />
            </GovApisContextProvider>
          </NotificationContextProvider>
        </RentContextProvider>
      </UserContextProvider>
    </VehicleContextProvider>
  </BrowserRouter>,
  // </StrictMode>,
);
