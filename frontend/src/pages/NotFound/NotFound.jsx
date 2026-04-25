import { useEffect, useState } from "react";
import styles from "./NotFound.module.css";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const [timer, setTimer] = useState(3);
  const navigate = useNavigate();

  useEffect(() => {
    const countdown = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(countdown);
  }, []);

  useEffect(() => {
    if (timer <= 0) {
      navigate("/");
    }
  }, [timer]);

  return (
    <div className={`${styles.NotFound}  page`}>
      <h1>Page Not Found</h1>
      <p>
        You will be redirected back to the homepage in{" "}
        <span className={styles.timer}>{timer}</span> seconds...
      </p>
    </div>
  );
};

export default NotFound;
