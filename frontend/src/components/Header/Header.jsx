import styles from "./Header.module.css";
import { Car, Bell, LogOut } from "lucide-react";
import { navByRole, labels, icons } from "./nav";
import { useUserContext } from "../../context/UserContext";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Header = ({ page }) => {
  const { currentUser, logout } = useUserContext();
  const location = useLocation();

  const visible = navByRole[currentUser?.role] || [];

  const navigate = useNavigate();

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
            const page = location.pathname.split("/")[1];
            const active = page === item;

            return (
              <Link
                to={"/" + item}
                key={item}
                className={`${styles.navButton}  ${active ? styles.active : ""}`}
              >
                {Icon && <Icon className="icon" />}
                {labels[item]}
              </Link>
            );
          })}
        </nav>

        {currentUser && (
          <div className={styles.logOutContainer}>
            <>
              <button className={styles.notifyButton}>
                <Bell className={`${styles.iconLarge} icon`} />
              </button>

              <button className={styles.logoutButton} onClick={handleLogOut}>
                <LogOut className={` ${styles.iconSmall} icon `} />
                Log out
              </button>
            </>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
