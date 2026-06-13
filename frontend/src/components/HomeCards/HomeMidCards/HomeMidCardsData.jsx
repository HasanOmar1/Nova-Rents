import styles from "./HomeMidCards.module.css";

const HomeMidCardsData = ({ title, data, date }) => {
  return (
    <div className={styles.dataContainer}>
      <div className={styles.data}>
        <p className={styles.dataTitle}>{title}</p>
        <p className={styles.description}>
          {data} <span className={styles.dateText}>• {date}</span>
        </p>
      </div>
    </div>
  );
};

export default HomeMidCardsData;
