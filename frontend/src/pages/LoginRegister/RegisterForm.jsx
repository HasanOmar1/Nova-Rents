import { useState } from "react";
import styles from "./LoginRegister.module.css";
import { ArrowRight } from "lucide-react";

const RegisterForm = () => {
  const [birthDate, setBirthDate] = useState("");

  const today = new Date();

  // 2. Calculate exactly 18 years ago for the MAX date
  const maxAgeDate = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate(),
  );
  const formattedMaxDate = maxAgeDate.toISOString().split("T")[0];

  // 3. Calculate 100 years ago for the MIN date
  const minAgeDate = new Date(
    today.getFullYear() - 100,
    today.getMonth(),
    today.getDate(),
  );
  const formattedMinDate = minAgeDate.toISOString().split("T")[0];

  return (
    <div className={`${styles.glassPanel} `}>
      <h2 className={styles.heading}>Register</h2>

      <div className={styles.formContainer}>
        <form className={styles.formSpace}>
          <div className={styles.inputRow}>
            <label className={styles.inputLabel}>
              <span className={styles.labelText}>First name</span>
              <input type="text" className={styles.inputField} />
            </label>
            <label className={styles.inputLabel}>
              <span className={styles.labelText}>Last name</span>
              <input type="text" className={styles.inputField} />
            </label>
          </div>

          <label className={styles.inputLabel}>
            <span className={styles.labelText}>Email address</span>
            <input type="email" className={styles.inputField} />
          </label>

          <label className={styles.inputLabel}>
            <span className={styles.labelText}>Contact number</span>
            <input type="tel" className={styles.inputField} />
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
            <input type="password" className={styles.inputField} />
          </label>

          <button className={styles.primaryButtonBlue}>
            Join Nova Rents
            <ArrowRight className={styles.iconSm} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;
