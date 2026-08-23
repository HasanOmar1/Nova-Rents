import { useNavigate } from "react-router-dom";
import styles from "./HomeTopCards.module.css";

const HomeTopCards = ({
  title,
  icon,
  value,
  className,
  isAction,
  to,
  onClick,
}) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate(to);
  };
  return (
    <div
      className={`${styles.HomeTopCards} ${className || ""} ${isAction ? styles.isAction : ""}`}
      onClick={isAction && to ? handleNavigate : onClick}
    >
      <div className={styles.top}>
        <p>{title}</p>
        {icon && <div className={styles.carBox}>{icon}</div>}
      </div>
      <div className={styles.bottom}>
        <p>{value}</p>
      </div>
    </div>
  );
};

export default HomeTopCards;
