// Renders the authentication hero and login/register selector.
// It consumes the active form and its setter, then returns hero JSX.
import styles from "./LoginRegister.module.css";
import heroImg from "../../assets/loginRegisterCar.avif";
import { Car } from "lucide-react";
import { useUserContext } from "../../context/UserContext";

// Displays the form selector and clears errors when the selection changes.
// It accepts form state props and returns the authentication hero JSX.
const FormOption = ({ setCurrentForm, currentForm }) => {
  const {setErrorMsg} = useUserContext()

  // Clears the current authentication error and selects the requested form.
  // It accepts a form name and returns undefined.
  const handleSwitchForm = (form) => {
    setErrorMsg("")
    setCurrentForm(form)
  }


  return (
    <div className={styles.heroSection}>
      <img src={heroImg} alt="car img" className={styles.heroImage} />
      <div className={styles.heroGradientDark} />
      <div className={styles.heroGradientBlue} />

      <div className={styles.heroContent}>
        <div className={styles.switchWrapper}>
          <div className={styles.switchContainer}>
            <button
              onClick={
                /* Handles the click callback for this rendered control.
                 * It accepts no arguments and returns the delegated result. */
                () => handleSwitchForm("login")}
              className={`${styles.switchBtn} ${currentForm === "login" && styles.switchBtnActive}`}
            >
              Sign in
            </button>
            <button
              onClick={
                /* Handles the click callback for this rendered control.
                 * It accepts no arguments and returns the delegated result. */
                () => handleSwitchForm("register")}
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
