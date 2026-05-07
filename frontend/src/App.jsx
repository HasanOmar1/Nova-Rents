import { Routes, Route } from "react-router-dom";
import Header from "./components/Header/Header";
import UserContextProvider from "./context/UserContext";
import NotFound from "./pages/NotFound/NotFound";
import LoginRegister from "./pages/UserUI/LoginRegister/LoginRegister";
import Home from "./pages/UserUI/Home/Home";
import Profile from "./pages/UserUI/Profile/Profile";
import Vehicles from "./pages/UserUI/Vehicles/Vehicles";
import Map from "./pages/UserUI/Map/Map";
import MyVehicles from "./pages/UserUI/MyVehicles/MyVehicles";
import Complaints from "./pages/UserUI/Complaints/Complaints";
import DashBoard from "./pages/AdminUI/DashBoard/DashBoard";

function App() {
  return (
    <>
      <UserContextProvider>
        <Header />
        <Routes>
          {/* User */}
          <Route path="/" element={<LoginRegister />} />
          <Route path="/home" element={<Home />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/map" element={<Map />} />
          <Route path="/myVehicles" element={<MyVehicles />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/complaints" element={<Complaints />} />
          {/* Admin */}
          <Route path="/dashboard" element={<DashBoard />} />

          {/* Not found page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </UserContextProvider>
    </>
  );
}

export default App;
