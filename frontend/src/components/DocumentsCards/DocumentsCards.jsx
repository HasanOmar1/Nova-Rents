import styles from "./DocumentsCards.module.css";
import { Upload } from "lucide-react";

const activityData = [
  {
    notification: "Driver License",
  },
  {
    notification: "Insurance",
  },
  {
    notification: "Ownership Proof",
  },
];

const DocumentsCards = () => {
  return (
    <div className={styles.DocumentsCards}>
      <h4>Documents</h4>

      {activityData.map((item) => {
        return (
          <div className={styles.dataContainer}>
            <div className={styles.data}>
              <p>{item.notification}</p>
              <label className={styles.customFileUpload}>
                <input type="file" />
                <Upload size={20} />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DocumentsCards;
