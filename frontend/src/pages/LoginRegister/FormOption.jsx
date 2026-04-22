import styles from "./LoginRegister.module.css";
import heroImg from "../../assets/loginRegisterCar.avif";
import { Car } from "lucide-react";

const FormOption = ({ setCurrentForm, currentForm }) => {
  return (
    <div className={styles.heroSection}>
      <img src={heroImg} alt="car img" className={styles.heroImage} />
      <div className={styles.heroGradientDark} />
      <div className={styles.heroGradientBlue} />

      <div className={styles.heroContent}>
        <div className={styles.switchWrapper}>
          <div className={styles.switchContainer}>
            <button
              onClick={() => setCurrentForm("login")}
              className={`${styles.switchBtn} ${currentForm === "login" && styles.switchBtnActive}`}
            >
              Sign in
            </button>
            <button
              onClick={() => setCurrentForm("register")}
              className={`${styles.switchBtn} ${currentForm === "register" && styles.switchBtnActive}`}
            >
              Register
            </button>
          </div>
        </div>

        <div className={styles.heroBottomText}>
          <div className={styles.brandGroup}>
            <div className={styles.brandIconWrap}>
              <Car className={styles.iconMd} />
            </div>
            <span className={styles.brandName}>Nova Rents</span>
          </div>
          <h1 className={styles.heroTitle}>
            The quiet standard of automotive freedom.
          </h1>
          <p className={styles.heroSubtext}>
            Exquisite machinery, invisible precision — curated for drivers who
            expect clarity before speed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FormOption;
