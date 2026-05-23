import { useState } from "react";
import styles from "./LoginRegister.module.css";
import { ArrowRight, Car, Shield, UserPlus } from "lucide-react";
import SignInForm from "./SignInForm";
import RegisterForm from "./RegisterForm";
import FormOption from "./FormOption";

const LoginRegister = () => {
  const [currentForm, setCurrentForm] = useState("login");

  return (
    <div className={`${styles.LoginRegister} page`}>
      <div className={styles.container}>
        <FormOption setCurrentForm={setCurrentForm} currentForm={currentForm} />

        {currentForm === "login" ? (
          <SignInForm setCurrentForm={setCurrentForm} />
        ) : (
          <RegisterForm setCurrentForm={setCurrentForm} />
        )}
      </div>
    </div>
  );
};

export default LoginRegister;
