import styles from "./LoginRegister.module.css";
import { ArrowRight, Car, Shield, UserPlus } from "lucide-react";

const heroImg =
  "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1600&q=85";

const LoginRegister = () => {
  return (
    <div className={`${styles.container} page`}>
      <div className={styles.gridLayout}>
        {/* Left Column — Sign In (Desktop Only) */}
        <div className={`${styles.glassPanel} ${styles.desktopCol}`}>
          <p className={styles.subheadingSky}>Member access</p>
          <h2 className={styles.heading}>Sign in</h2>
          <p className={styles.description}>
            Return to your reservations and listings.
          </p>

          <div className={styles.formContainer}>
            <form className={styles.formSpace}>
              <label className={styles.inputLabel}>
                <span className={styles.labelText}>Email address</span>
                <input
                  type="email"
                  placeholder="Email address"
                  className={styles.inputField}
                />
              </label>

              <label className={styles.inputLabel}>
                <span className={styles.labelText}>Password</span>
                <input
                  type="password"
                  placeholder="Password"
                  className={styles.inputField}
                />
              </label>

              <button type="submit" className={styles.primaryButtonBlue}>
                Enter Nova Rents
                <ArrowRight className={styles.iconSm} />
              </button>

              <div className={styles.linkGroup}>
                <span className={styles.link}>Forgot password?</span>
                <span className={styles.link}>Support</span>
              </div>
            </form>
          </div>
        </div>

        {/* Center Column — Hero Section */}
        <div className={styles.heroSection}>
          <img src={heroImg} alt="" className={styles.heroImage} />
          <div className={styles.heroGradientDark} />
          <div className={styles.heroGradientBlue} />

          <div className={styles.heroContent}>
            <div className={styles.switchWrapper}>
              <div className={styles.switchContainer}>
                {/* Active switch button example */}
                <button
                  type="button"
                  className={`${styles.switchBtn} ${styles.switchBtnActive}`}
                >
                  Sign in
                </button>
                {/* Inactive switch button example */}
                <button type="button" className={styles.switchBtn}>
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
                Exquisite machinery, invisible precision — curated for drivers
                who expect clarity before speed.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column — Register (Desktop Only) */}
        <div className={`${styles.glassPanel} ${styles.desktopCol}`}>
          <p className={styles.subheadingEmerald}>New membership</p>
          <h2 className={styles.heading}>Apply now</h2>
          <p className={styles.description}>
            Request access to list or book premium vehicles.
          </p>

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
                <span className={styles.labelText}>Choose password</span>
                <input type="password" className={styles.inputField} />
              </label>
            </form>
          </div>
        </div>
      </div>

      {/* Mobile Form Section (Hidden on Desktop) */}
      <div className={styles.mobileSection}>
        {/* You can toggle the contents here based on your future logic. 
             Currently rendering the Sign In form as a placeholder. */}
        <div className={styles.glassPanelMobile}>
          <form className={styles.formSpace}>
            <label className={styles.inputLabel}>
              <span className={styles.labelText}>Email address</span>
              <input
                type="email"
                placeholder="Email address"
                className={styles.inputField}
              />
            </label>
            <label className={styles.inputLabel}>
              <span className={styles.labelText}>Password</span>
              <input
                type="password"
                placeholder="Password"
                className={styles.inputField}
              />
            </label>
            <button type="submit" className={styles.primaryButtonBlue}>
              Enter Nova Rents
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// const LoginRegister = () => {
//   return (
//     <div className={`${styles.LoginRegister} page`}>
//       <div className={styles.allMenus}>
//         <div className={styles.left}>

//         </div>
//         <div className={styles.mid}></div>
//         <div className={styles.right}></div>
//       </div>
//     </div>
//   );
// };

export default LoginRegister;
