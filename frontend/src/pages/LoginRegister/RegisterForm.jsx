import { useState } from "react";
import styles from "./LoginRegister.module.css";
import { ArrowRight } from "lucide-react";
import { useUserContext } from "../../context/UserContext";
import { formattedMaxDate, formattedMinDate } from "../../utils/minMaxDate";

const RegisterForm = ({ setCurrentForm }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const { register, errorMsg, setErrorMsg } = useUserContext();

  const handleCurrentForm = () => {
    setCurrentForm("login");
    setErrorMsg("");
  };

  const handleRegister = (e) => {
    e.preventDefault();
    const formData = {
      firstName,
      lastName,
      email,
      password,
      phone,
      birthDate,
    };

    register(formData);
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
                onChange={(e) => setFirstName(e.target.value)}
              />
            </label>
            <label className={styles.inputLabel}>
              <span className={styles.labelText}>Last name</span>
              <input
                type="text"
                className={styles.inputField}
                onChange={(e) => setLastName(e.target.value)}
              />
            </label>
          </div>

          <label className={styles.inputLabel}>
            <span className={styles.labelText}>Email address</span>
            <input
              type="email"
              className={styles.inputField}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className={styles.inputLabel}>
            <span className={styles.labelText}>Contact number</span>
            <input
              type="tel"
              className={styles.inputField}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <label className={styles.inputLabel}>
            <span className={styles.labelText}>Birth Date</span>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button className={styles.primaryButtonBlue}>
            Join Nova Rents
            <ArrowRight className={styles.iconSm} />
          </button>
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
