// Provides the credential form used to sign an existing user in.
// It accepts a form setter prop and returns the sign-in panel JSX.
import { ArrowRight } from "lucide-react";
import styles from "./LoginRegister.module.css";
import { useState } from "react";
import { useUserContext } from "../../context/UserContext";
import AsyncButton from "../../components/AsyncButton/AsyncButton";

// Renders and manages the sign-in form for an existing account.
// It accepts a form setter and returns the sign-in panel JSX.
const SignInForm = ({ setCurrentForm }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, errorMsg, setErrorMsg } = useUserContext();

  // Switches to registration and clears any authentication error.
  // It takes no arguments and returns undefined.
  const handleCurrentForm = () => {
    setCurrentForm("register");
    setErrorMsg("");
  };

  // Prevents native submission and sends the current credentials to login.
  // It accepts a form event and returns a promise that resolves after login.
  const loginHandler = async (e) => {
    e.preventDefault();
    const formData = {
      email,
      password,
    };

    setIsSubmitting(true);
    try { await login(formData); } finally { setIsSubmitting(false); }
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
              onChange={
                /* Handles the change callback for this rendered control.
                 * It accepts e and returns the delegated result. */
                (e) => setEmail(e.target.value)}
              placeholder="Email address"
              className={styles.inputField}
            />
          </label>

          <label className={styles.inputLabel}>
            <span className={styles.labelText}>Password</span>
            <input
              value={password}
              onChange={
                /* Handles the change callback for this rendered control.
                 * It accepts e and returns the delegated result. */
                (e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              className={styles.inputField}
            />
          </label>

          <AsyncButton className={styles.primaryButtonBlue} loading={isSubmitting} loadingText="Signing in...">
            Enter Nova Rents
            <ArrowRight className={styles.iconSm} />
          </AsyncButton>
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
