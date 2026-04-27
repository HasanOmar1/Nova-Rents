import { useState } from "react";
import { useUserContext } from "../../context/UserContext";
import styles from "./LoginRegister.module.css";
import { ArrowRight, Car, Shield, UserPlus } from "lucide-react";
import SignInForm from "./SignInForm";
import RegisterForm from "./RegisterForm";
import FormOption from "./FormOption";
import { useNavigate } from "react-router-dom";

const LoginRegister = () => {
  const [currentForm, setCurrentForm] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useUserContext();
  const navigate = useNavigate();

  const loginHandler = (e) => {
    e.preventDefault();
    const formData = {
      email,
      password,
    };

    if (email.trim() && password.trim()) {
      login(formData);
      navigate("/home");
    }

    console.log(formData);
  };

  const handleRegister = (e) => {
    e.preventDefault();
  };

  return (
    <div className={`${styles.LoginRegister} page`}>
      <div className={styles.container}>
        <FormOption setCurrentForm={setCurrentForm} currentForm={currentForm} />

        {currentForm === "login" ? (
          <SignInForm
            email={email}
            password={password}
            setEmail={setEmail}
            setPassword={setPassword}
            loginHandler={loginHandler}
            setCurrentForm={setCurrentForm}
          />
        ) : (
          <RegisterForm handleRegister={handleRegister} />
        )}
      </div>
    </div>
  );
};

export default LoginRegister;
