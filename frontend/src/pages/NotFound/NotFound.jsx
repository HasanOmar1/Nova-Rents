// Displays a countdown when a route cannot be found.
// It takes no props and returns the role-aware redirect page.
import { useEffect, useState } from "react";
import styles from "./NotFound.module.css";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../../context/UserContext";

// Renders the missing-page countdown and redirects when it expires.
// It takes no props and returns the not-found page JSX.
const NotFound = () => {
  const [timer, setTimer] = useState(3);
  const navigate = useNavigate();
  const { currentUser } = useUserContext();

  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
    const countdown = setInterval(
      /* Decrements the redirect countdown each time the interval fires.
       * It accepts no arguments and returns undefined. */
      () => {
          setTimer(
            /* Derives the next timer state value.
             * It accepts prev and returns the replacement state. */
            (prev) => prev - 1);
        }, 1000);
      /* Releases resources created by the surrounding operation.
       * It accepts no arguments and returns undefined. */
      return () => clearInterval(countdown);
    }, []);

  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      if (timer <= 0) {
        if (currentUser?.role === "user") {
          navigate("/home");
        } else if (currentUser?.role === "admin") {
          navigate("/dashboard");
        } else {
          navigate("/");
        }
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
