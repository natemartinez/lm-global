import styles from './Loader.module.css';

/**
 * A simple loading spinner component with proper ARIA attributes.
 */
function Loader({ size = 40 }) {
  return (
    <div className={styles.wrapper} role="status" aria-live="polite">
      <div
        className={styles.spinner}
        style={{ width: size, height: size }}
        aria-label="Loading"
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default Loader;
