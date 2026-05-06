import { ArrowRight } from "lucide-react";
import styles from "./LoginRegister.module.css";
import { useNavigate } from "react-router-dom";

const SignInForm = ({
  email,
  setEmail,
  password,
  setPassword,
  loginHandler,
  setCurrentForm,
}) => {
  return (
    <div className={`${styles.glassPanel} ${styles.signInPanel} `}>
      <h2 className={styles.heading}>Sign in</h2>

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
          <p className={styles.link}>Forgot password?</p>
          <p>
            Dont have an account yet?{" "}
            <span
              className={styles.link}
              onClick={() => setCurrentForm("register")}
            >
              Register
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignInForm;
