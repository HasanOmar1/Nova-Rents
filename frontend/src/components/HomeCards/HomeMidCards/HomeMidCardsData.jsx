import styles from "./HomeMidCards.module.css";

const HomeMidCardsData = ({ title, data }) => {
  return (
    <div className={styles.dataContainer}>
      <div className={styles.data}>
        <p>{title}</p>
        <p className={styles.date}>{data}</p>
      </div>
    </div>
  );
};

export default HomeMidCardsData;
