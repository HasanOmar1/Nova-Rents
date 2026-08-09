import { ArrowRight } from "lucide-react";
import styles from "./LoginRegister.module.css";
import { useState } from "react";
import { useUserContext } from "../../context/UserContext";

const SignInForm = ({ setCurrentForm }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, errorMsg, setErrorMsg } = useUserContext();

  const handleCurrentForm = () => {
    setCurrentForm("register");
    setErrorMsg("");
  };

  const loginHandler = (e) => {
    e.preventDefault();
    const formData = {
      email,
      password,
    };

    login(formData);
  };

  return (
    <div className={`${styles.glassPanel} ${styles.signInPanel} `}>
      <div className={styles.headingContainer}>
        <h2 className={styles.heading}>Sign in</h2>
        {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}
      </div>

      <div className={styles.formContainer}>
        <form className={styles.formSpace} onSubmit={loginHandler}>
          <label className={styles.inputLabel}>
            <span className={styles.labelText}>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className={styles.inputField}
            />
          </label>

          <label className={styles.inputLabel}>
            <span className={styles.labelText}>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              className={styles.inputField}
            />
          </label>

          <button className={styles.primaryButtonBlue}>
            Enter Nova Rents
            <ArrowRight className={styles.iconSm} />
          </button>
        </form>
        <div className={styles.linkGroup}>
          {/* <p className={styles.link}>Forgot password?</p> */}
          <p>
            Dont have an account yet?{" "}
            <span className={styles.link} onClick={handleCurrentForm}>
              Register
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignInForm;
