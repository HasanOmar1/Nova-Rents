// Defines the Home Top Cards React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import { useNavigate } from "react-router-dom";
import styles from "./HomeTopCards.module.css";

// Renders the Home Top Cards interface.
// Accepts an options object and returns rendered JSX.
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

  // Handles navigate for the surrounding interface.
  // Takes no arguments and returns nothing.
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
