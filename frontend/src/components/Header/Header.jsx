import styles from "./Header.module.css";

const Header = () => {
  return (
    <header className={styles.Header}>
      <div className={styles.siteDetails}>
        <div className={styles.logo}>{/* <img src="" alt="" /> */}</div>

        <div className={styles.siteName}>
          <h2>Nova Rents</h2>
          <p>Luxury vehicle rental</p>
        </div>
      </div>
    </header>
  );
};

export default Header;
