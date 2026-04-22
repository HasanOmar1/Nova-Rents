import { Routes, Route } from "react-router-dom";
import Header from "./components/Header/Header";
import UserContextProvider from "./context/UserContext";
import LoginRegister from "./pages/LoginRegister/LoginRegister";
import NotFound from "./pages/NotFound/NotFound";

function App() {
  return (
    <>
      <UserContextProvider>
        <Header />
        <Routes>
          <Route path="/" element={<LoginRegister />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </UserContextProvider>
    </>
  );
}

export default App;
