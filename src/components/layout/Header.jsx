import styles from './Header.module.css';
import { RetinaImage } from '@components/common';
import logo1x from '@assets/TestLogo/TestLogo.png';
import homeIcon from '@assets/home_FILL0_wght300_GRAD0_opsz24/home_FILL0_wght300_GRAD0_opsz24.png';
import groupIcon from '@assets/group_FILL0_wght300_GRAD0_opsz24/group_FILL0_wght300_GRAD0_opsz24.png';
import calendarIcon from '@assets/calendar_today_FILL0_wght300_GRAD0_opsz24/calendar_today_FILL0_wght300_GRAD0_opsz24.png';
import chatIcon from '@assets/chat_bubble_FILL0_wght300_GRAD0_opsz24/chat_bubble_FILL0_wght300_GRAD0_opsz24.png';
import creditCardIcon from '@assets/credit_card_FILL0_wght300_GRAD0_opsz24/credit_card_FILL0_wght300_GRAD0_opsz24.png';
import doctorAvatar from '@assets/senior-woman-doctor/senior-woman-doctor-and-portrait-smile-for-health-2023-11-27-05-18-16-utc.png';

const navItems = [
  { label: 'Overview', icon: homeIcon, active: false },
  { label: 'Patients', icon: groupIcon, active: true },
  { label: 'Schedule', icon: calendarIcon, active: false },
  { label: 'Message', icon: chatIcon, active: false },
  { label: 'Transactions', icon: creditCardIcon, active: false },
];

function Header() {
  return (
    <header className={styles.header} role="banner">
      {/* ZONE 1: Logo (Left) */}
      <div className={styles.zoneLeft}>
        <RetinaImage src={logo1x} alt="Tech Care" height={32} className={styles.logo} />
      </div>

      {/* ZONE 2: Nav Links (Center) */}
      <nav className={styles.zoneCenter} aria-label="Main Navigation">
        <ul className={styles.navList}>
          {navItems.map((item) => (
            <li
              key={item.label}
              className={`${styles.navItem} ${item.active ? styles.active : ''}`}
              aria-current={item.active ? 'page' : undefined}
            >
              <RetinaImage
                src={item.icon}
                alt=""
                className={styles.navIcon}
                width={16}
                height={16}
              />
              <span className={styles.label}>{item.label}</span>
            </li>
          ))}
        </ul>
      </nav>

      {/* ZONE 3: Profile & Actions (Right) */}
      <div className={styles.zoneRight}>
        <div className={styles.profile}>
          <RetinaImage
            src={doctorAvatar}
            alt="Dr. Jose Simmons"
            className={styles.avatarCircle}
            width={44}
            height={44}
          />
          <div className={styles.profileText}>
            <strong className={styles.profileName}>Dr. Jose Simmons</strong>
            <br />
            <span className={styles.title}>General Practitioner</span>
          </div>
        </div>
        <button className={styles.iconButton} aria-label="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <div className={styles.divider} aria-hidden="true" />
        <button className={styles.iconButton} aria-label="More options">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <circle cx="10" cy="4" r="2" />
            <circle cx="10" cy="10" r="2" />
            <circle cx="10" cy="16" r="2" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export default Header;
