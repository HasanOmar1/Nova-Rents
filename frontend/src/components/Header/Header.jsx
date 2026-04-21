import styles from "./Header.module.css";
import { Car, Menu, Bell, LogOut } from "lucide-react";
import { navByRole, labels, icons } from "./nav";

const Header = ({ role, page }) => {
  const visible = navByRole[role] || [];

  return (
    <header className={styles.Header}>
      <div className={styles.siteDetails}>
        <div className={styles.logoAndName}>
          <div className={styles.logo}>
            <Car size={32} />
          </div>
          <div className={styles.siteName}>
            <h2>Nova Rents</h2>
            <p>Luxury vehicle rental</p>
          </div>
        </div>

        <nav>
          {visible.map((item) => {
            const Icon = icons[item];
            const active = page === item;

            return (
              <button
                key={item}
                // onClick={() => setPage(item)}
                className={`${styles.navButton}  ${active ? styles.active : ""}`}
              >
                {Icon && <Icon className="nav-icon" />}
                {labels[item]}
              </button>
            );
          })}
        </nav>

        <div className={styles.logOutContainer}>
          <>
            <button className={styles.notifyButton}>
              <Bell className={styles.iconLarge} />
            </button>

            <button className={styles.logoutButton}>
              <LogOut className={styles.iconSmall} />
              Log out
            </button>
          </>

          {/* <button type="button" className={styles.menuButton}>
            <Menu className={styles.iconLarge} />
          </button> */}
        </div>
      </div>
    </header>
  );
};

export default Header;
