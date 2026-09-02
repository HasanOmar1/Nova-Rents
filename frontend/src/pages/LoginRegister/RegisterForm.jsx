// Provides the account-registration form and its submission state.
// It accepts a form setter prop and returns the registration panel JSX.
import { useState } from "react";
import styles from "./LoginRegister.module.css";
import { ArrowRight } from "lucide-react";
import { useUserContext } from "../../context/UserContext";
import { formattedMaxDate, formattedMinDate } from "../../utils/minMaxDate";
import AsyncButton from "../../components/AsyncButton/AsyncButton";

// Renders and manages registration fields for a new account.
// It accepts a form setter and returns the registration panel JSX.
const RegisterForm = ({ setCurrentForm }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, errorMsg, setErrorMsg } = useUserContext();

  // Switches to sign-in and clears any authentication error.
  // It takes no arguments and returns undefined.
  const handleCurrentForm = () => {
    setCurrentForm("login");
    setErrorMsg("");
  };

  // Prevents native submission and registers the entered account details.
  // It accepts a form event and returns a promise resolved after registration.
  const handleRegister = async (e) => {
    e.preventDefault();
    const formData = {
      firstName,
      lastName,
      email,
      password,
      phone,
      birthDate,
    };

    setIsSubmitting(true);
    try { await register(formData); } finally { setIsSubmitting(false); }
  };

  return (
    <div className={`${styles.glassPanel} `}>
      <div className={styles.headingContainer}>
        <h2 className={styles.heading}>Register</h2>
        {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}
      </div>

      <div className={styles.formContainer}>
        <form className={styles.formSpace} onSubmit={handleRegister}>
          <div className={styles.inputRow}>
            <label className={styles.inputLabel}>
              <span className={styles.labelText}>First name</span>
              <input
                type="text"
                className={styles.inputField}
                onChange={
                  /* Handles the change callback for this rendered control.
                   * It accepts e and returns the delegated result. */
                  (e) => setFirstName(e.target.value)}
              />
            </label>
            <label className={styles.inputLabel}>
              <span className={styles.labelText}>Last name</span>
              <input
                type="text"
                className={styles.inputField}
                onChange={
                  /* Handles the change callback for this rendered control.
                   * It accepts e and returns the delegated result. */
                  (e) => setLastName(e.target.value)}
              />
            </label>
          </div>

          <label className={styles.inputLabel}>
            <span className={styles.labelText}>Email address</span>
            <input
              type="email"
              className={styles.inputField}
              onChange={
                /* Handles the change callback for this rendered control.
                 * It accepts e and returns the delegated result. */
                (e) => setEmail(e.target.value)}
            />
          </label>

          <label className={styles.inputLabel}>
            <span className={styles.labelText}>Contact number</span>
            <input
              type="tel"
              className={styles.inputField}
              onChange={
                /* Handles the change callback for this rendered control.
                 * It accepts e and returns the delegated result. */
                (e) => setPhone(e.target.value)}
            />
          </label>

          <label className={styles.inputLabel}>
            <span className={styles.labelText}>Birth Date</span>
            <input
              type="date"
              value={birthDate}
              onChange={
                /* Handles the change callback for this rendered control.
                 * It accepts e and returns the delegated result. */
                (e) => setBirthDate(e.target.value)}
              min={formattedMinDate}
              max={formattedMaxDate}
              className={styles.inputField}
            />
          </label>

          <label className={styles.inputLabel}>
            <span className={styles.labelText}>Password</span>
            <input
              type="password"
              className={styles.inputField}
              onChange={
                /* Handles the change callback for this rendered control.
                 * It accepts e and returns the delegated result. */
                (e) => setPassword(e.target.value)}
            />
          </label>

          <AsyncButton className={styles.primaryButtonBlue} loading={isSubmitting} loadingText="Creating account...">
            Join Nova Rents
            <ArrowRight className={styles.iconSm} />
          </AsyncButton>
        </form>
        <div className={styles.linkGroup}>
          <p>
            Already have an account?{" "}
            <span className={styles.link} onClick={handleCurrentForm}>
              Sign in
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
