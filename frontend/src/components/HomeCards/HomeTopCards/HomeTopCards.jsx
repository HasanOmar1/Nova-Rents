import styles from "./HomeTopCards.module.css";
import { Car } from "lucide-react";

const HomeTopCards = ({ title, icon, value }) => {
  return (
    <div className={styles.HomeTopCards}>
      <div className={styles.top}>
        <p>{title}</p>
        <div className={styles.carBox}>{icon}</div>
      </div>
      <div className={styles.bottom}>
        <p>{value}</p>
      </div>
    </div>
  );
};

export default HomeTopCards;
