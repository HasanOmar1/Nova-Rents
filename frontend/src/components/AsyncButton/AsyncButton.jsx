import styles from "./AsyncButton.module.css";

const AsyncButton = ({ loading = false, loadingText = "Please wait...", disabled, children, className = "", ...props }) => (
  <button
    {...props}
    className={`${className} ${loading ? styles.loading : ""}`}
    disabled={disabled || loading}
    aria-busy={loading}
  >
    {loading ? (
      <><span className={styles.spinner} aria-hidden="true" /><span>{loadingText}</span></>
    ) : children}
  </button>
);

export default AsyncButton;
