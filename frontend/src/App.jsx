import { Routes, Route } from "react-router-dom";
import Header from "./components/Header/Header";
import UserContextProvider from "./context/UserContext";
import LoginRegister from "./pages/LoginRegister/LoginRegister";
import NotFound from "./pages/NotFound/NotFound";
import Home from "./pages/Home/Home";
import Vehicles from "./pages/Vehicles/Vehicles";
import MyVehicles from "./pages/MyVehicles/MyVehicles";
import Map from "./pages/Map/Map";
import Profile from "./pages/Profile/Profile";
import Complaints from "./pages/Complaints/Complaints";

function App() {
  return (
    <>
      <UserContextProvider>
        <Header />
        <Routes>
          <Route path="/" element={<LoginRegister />} />
          <Route path="/home" element={<Home />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/map" element={<Map />} />
          <Route path="/myVehicles" element={<MyVehicles />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </UserContextProvider>
    </>
  );
}

export default App;
