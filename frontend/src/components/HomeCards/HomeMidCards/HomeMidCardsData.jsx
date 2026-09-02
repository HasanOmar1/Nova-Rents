// Defines the Home Mid Cards Data React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import styles from "./HomeMidCards.module.css";

// Renders the Home Mid Cards Data interface.
// Accepts an options object and returns rendered JSX.
const HomeMidCardsData = ({ title, data, date }) => {
  return (
    <div className={styles.dataContainer}>
      <div className={styles.data}>
        <p className={styles.dataTitle}>
          {title} • <span className={styles.date}>{date}</span>
        </p>
        <p className={styles.description}>{data}</p>
      </div>
    </div>
  );
};

export default HomeMidCardsData;
