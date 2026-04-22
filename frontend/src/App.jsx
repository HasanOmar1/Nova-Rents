import Header from "./components/Header/Header";
import UserContextProvider from "./context/UserContext";
import LoginRegister from "./pages/LoginRegister/LoginRegister";

function App() {
  return (
    <>
      <UserContextProvider>
        <Header role={"user"} />
        <LoginRegister />
      </UserContextProvider>
    </>
  );
}

export default App;
