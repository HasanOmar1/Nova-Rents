import { useState } from "react";
import { useUserContext } from "../../context/UserContext";
import styles from "./LoginRegister.module.css";
import { ArrowRight, Car, Shield, UserPlus } from "lucide-react";
import SignInForm from "./SignInForm";
import RegisterForm from "./RegisterForm";
import FormOption from "./FormOption";

// const heroImg =
//   "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1600&q=85";

const LoginRegister = () => {
  const [currentForm, setCurrentForm] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useUserContext();

  const loginHandler = (e) => {
    e.preventDefault();
    const formData = {
      email,
      password,
    };

    if (email.trim() && password.trim()) login(formData);

    console.log(formData);
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
          />
        ) : (
          <RegisterForm />
        )}
      </div>
    </div>
  );
};

export default LoginRegister;
