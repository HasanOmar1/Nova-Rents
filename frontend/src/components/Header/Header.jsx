import styles from "./Header.module.css";
import {
  Car,
  Bell,
  LogOut,
  TableOfContents,
  History,
  Mail,
} from "lucide-react";
import { navByRole, labels, icons } from "./nav";
import { useUserContext } from "../../context/UserContext";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useNotificationContext } from "../../context/NotificationContext";
import AsyncButton from "../AsyncButton/AsyncButton";
import { useRef } from "react";
import { useEffect } from "react";

const Header = () => {
  const { currentUser, logout } = useUserContext();
  const { unreadCount } = useNotificationContext();
  const [areMoreTabsOpen, setAreMoreTabsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const tabsRef = useRef(null);

  const visible = navByRole[currentUser?.role] || [];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tabsRef.current && !tabsRef.current.contains(event.target)) {
        setAreMoreTabsOpen(false);
      }
    };

    // mousedown = clicking on mouse
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogOut = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleTabs = () => {
    setAreMoreTabsOpen((prev) => !prev);
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
              <Link
                to={currentUser.role === "admin" ? "/dashboard" : "/home"}
                className={styles.notifyButton}
              >
                <Bell className={`${styles.iconLarge} icon`} />

                {unreadCount > 0 && (
                  <span className={styles.notificationBadge}>
                    {unreadCount}
                  </span>
                )}
              </Link>

              {currentUser?.role === "user" ? (
                <>
                  <div className={styles.tabsContainer} ref={tabsRef}>
                    <button
                      type="button"
                      className={styles.tabsButton}
                      onClick={handleTabs}
                      aria-label="Open account menu"
                      aria-expanded={areMoreTabsOpen}
                      aria-controls="account-menu"
                    >
                      <TableOfContents className={`${styles.iconLarge} icon`} />
                    </button>

                    {areMoreTabsOpen && (
                      <div
                        id="account-menu"
                        className={styles.moreTabsContainer}
                      >
                        <Link
                          className={styles.menuLink}
                          to="/rentalDashboard"
                          onClick={() => setAreMoreTabsOpen(false)}
                        >
                          <History className={` ${styles.iconSmall} icon `} />
                          Rental Dashboard
                        </Link>
                        <Link
                          className={`${styles.menuLink} ${
                            location.pathname === "/contact"
                              ? styles.activeMenuLink
                              : ""
                          }`}
                          to="/contact"
                          onClick={() => setAreMoreTabsOpen(false)}
                          aria-current={
                            location.pathname === "/contact"
                              ? "page"
                              : undefined
                          }
                        >
                          <Mail className={`${styles.iconSmall} icon`} />
                          Contact Us
                        </Link>
                        <AsyncButton
                          className={styles.logoutButton}
                          onClick={handleLogOut}
                          loading={isLoggingOut}
                          loadingText="Logging out..."
                        >
                          <LogOut className={` ${styles.iconSmall} icon `} />
                          Log out
                        </AsyncButton>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <AsyncButton
                  className={styles.logoutButtonAdmin}
                  onClick={handleLogOut}
                  loading={isLoggingOut}
                  loadingText="Logging out..."
                >
                  <LogOut className={` ${styles.iconSmall} icon `} />
                  Log out
                </AsyncButton>
              )}
            </>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
