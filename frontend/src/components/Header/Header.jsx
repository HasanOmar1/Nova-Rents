import styles from "./Header.module.css";
import { Car, Menu, Bell, LogOut } from "lucide-react";
import { navByRole, labels, icons } from "./nav";
import { useUserContext } from "../../context/UserContext";
import { useEffect, useState } from "react";

const Header = ({ page }) => {
  const { currentUser, logout } = useUserContext();
  const visible = navByRole[currentUser?.role] || [];

  const handleLogOut = () => {
    logout();
  };

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

        {currentUser?.role === "admin" ||
          (currentUser?.role === "user" && (
            <div className={styles.logOutContainer}>
              <>
                <button className={styles.notifyButton}>
                  <Bell className={styles.iconLarge} />
                </button>

                <button className={styles.logoutButton} onClick={handleLogOut}>
                  <LogOut className={styles.iconSmall} />
                  Log out
                </button>
              </>
            </div>
          ))}
      </div>
    </header>
  );
};

export default Header;
