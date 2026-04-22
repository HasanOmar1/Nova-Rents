import styles from "./NotFound.module.css";

const NotFound = () => {
  return (
    <div className={`${styles.NotFound}  page`}>
      <h1>Error 404</h1>
      <h1>Page Not Found</h1>
    </div>
  );
};

export default NotFound;
