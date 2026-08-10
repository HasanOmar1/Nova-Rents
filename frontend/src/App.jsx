import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header/Header";
import { useUserContext } from "./context/UserContext";
import LoginRegister from "./pages/LoginRegister/LoginRegister";
import NotFound from "./pages/NotFound/NotFound";
import Home from "./pages/UserUI/Home/Home";
import Profile from "./pages/UserUI/Profile/Profile";
import Vehicles from "./pages/UserUI/Vehicles/Vehicles";
import Map from "./pages/UserUI/Map/Map";
import MyVehicles from "./pages/UserUI/MyVehicles/MyVehicles";
import Complaints from "./pages/UserUI/Complaints/Complaints";
import DashBoard from "./pages/AdminUI/DashBoard/DashBoard";
import Users from "./pages/AdminUI/Users/Users";
import AllVehicles from "./pages/AdminUI/AllVehicles/AllVehicles";
import Statistics from "./pages/AdminUI/Statistics/Statistics";
import ComplaintsAdmin from "./pages/AdminUI/Complaints/ComplaintsAdmin";
import VehicleDetails from "./pages/VehicleDetails/VehicleDetails";
import RentalDashboard from "./pages/UserUI/RentalDashboard/RentalDashboard";
import Payment from "./pages/UserUI/Payment/Payment";
import UserStats from "./pages/UserStats/UserStats";
import ReportedUsers from "./pages/AdminUI/ReportedUsers/ReportedUsers";

function App() {
  const { currentUser, isLoading } = useUserContext();

  if (isLoading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", marginTop: "20vh" }}
      >
        <h2>Loading Nova Rents...</h2>
      </div>
    );
  }
  return (
    <>
      <Header />
      <Routes>
        {/* User */}
        {currentUser?.role === "user" ? (
          <>
            <Route path="/" element={<Navigate to="/home" replace />} />

            <Route path="/home" element={<Home />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/map" element={<Map />} />
            <Route path="/myVehicles" element={<MyVehicles />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/rentalDashboard" element={<RentalDashboard />} />
            <Route path="/payments/:paymentToken" element={<Payment />} />
          </>
        ) : currentUser?.role === "admin" ? (
          <>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Admin */}
            <Route path="/dashboard" element={<DashBoard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/allVehicles" element={<AllVehicles />} />
            <Route path="/complaintsAdmin" element={<ComplaintsAdmin />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/reportedUsers" element={<ReportedUsers />} />
          </>
        ) : (
          <>
            <Route path="/" element={<LoginRegister />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
          </>
        )}

        {/* other pages */}

        {currentUser && (
          <>
            <Route path="/vehicles/:id" element={<VehicleDetails />} />
            <Route path="/userStats/:email" element={<UserStats />} />
          </>
        )}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
