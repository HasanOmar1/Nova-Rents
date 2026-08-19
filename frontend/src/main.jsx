// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import UserContextProvider from "./context/UserContext.jsx";
import VehicleContextProvider from "./context/VehicleContext.jsx";
import NotificationContextProvider from "./context/NotificationContext.jsx";
import ActivityContextProvider from "./context/ActivityContext.jsx";
import RentContextProvider from "./context/RentContext.jsx";
import GovApisContextProvider from "./context/GovApisContext.jsx";
import ComplaintContextProvider from "./context/ComplaintContext.jsx";
import ReportContextProvider from "./context/ReportContext.jsx";
import DocumentContextProvider from "./context/DocumentContext.jsx";

axios.defaults.baseURL = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL
  : "http://localhost:3000";

axios.defaults.withCredentials = true;

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <UserContextProvider>
      <NotificationContextProvider>
        <ActivityContextProvider>
          <VehicleContextProvider>
            <RentContextProvider>
              <GovApisContextProvider>
                <ComplaintContextProvider>
                  <ReportContextProvider>
                    <DocumentContextProvider>
                      <App />
                    </DocumentContextProvider>
                  </ReportContextProvider>
                </ComplaintContextProvider>
              </GovApisContextProvider>
            </RentContextProvider>
          </VehicleContextProvider>
        </ActivityContextProvider>
      </NotificationContextProvider>
    </UserContextProvider>
  </BrowserRouter>,
);
