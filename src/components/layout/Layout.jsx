import Header from './Header';
import styles from './Layout.module.css';

function Layout({ children }) {
  return (
    <div className={styles.layout}>
      {/* Skip-to-content link for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Header />
      <div className={styles.dashboardLayout} id="main-content" role="presentation">
        {children}
      </div>
    </div>
  );
}

export default Layout;
