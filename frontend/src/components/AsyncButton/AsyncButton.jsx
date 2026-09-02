// Defines the Async Button React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import styles from "./AsyncButton.module.css";

// Renders the Async Button interface.
// Accepts an options object and returns rendered JSX.
const AsyncButton = ({
  loading = false,
  loadingText = "Please wait...",
  disabled,
  children,
  className = "",
  ...props
}) => (
  <button
    {...props}
    className={`${className} ${loading ? styles.loading : ""}`}
    disabled={disabled || loading}
    aria-busy={loading}
  >
    {loading ? (
      <>
        <span className={styles.spinner} aria-hidden="true" />
        <span>{loadingText}</span>
      </>
    ) : (
      children
    )}
  </button>
);

export default AsyncButton;
