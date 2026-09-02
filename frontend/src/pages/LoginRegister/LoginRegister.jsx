// Hosts the authentication screen and switches between its two forms.
// It takes no props and returns the login or registration layout.
import { useState } from "react";
import styles from "./LoginRegister.module.css";
import SignInForm from "./SignInForm";
import RegisterForm from "./RegisterForm";
import FormOption from "./FormOption";

// Tracks which authentication form is active and renders that form.
// It takes no props and returns the authentication page JSX.
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
