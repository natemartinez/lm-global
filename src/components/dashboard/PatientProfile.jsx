import styles from './PatientProfile.module.css';
import { RetinaImage } from '@components/common';

/** Inline SVG icons with #072635 color for proper contrast on #F6F7F8 circles. */
const ICON_COLOR = '#072635';

const FIELD_ICONS = {
  date_of_birth: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="16" height="15" rx="2" stroke={ICON_COLOR} strokeWidth="1.5" />
      <path d="M2 7h16" stroke={ICON_COLOR} strokeWidth="1.5" />
      <path d="M6 1v4M14 1v4" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 10h2M12 10h2M6 13h2M12 13h2" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  gender: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="6" r="4" stroke={ICON_COLOR} strokeWidth="1.5" />
      <path d="M10 10v9M7 15h6" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  phone_number: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#07263E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  emergency_contact: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#07263E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  insurance_type: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 1l8 3v5c0 4-3.5 7.5-8 9-4.5-1.5-8-5-8-9V4l8-3z" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 10l2 2 4-4" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

/** Full month names for date formatting. */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Format a date string (e.g., "08/23/1996") to "Month DD, YYYY".
 * Falls back to the original value if parsing fails.
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  // Try parsing as MM/DD/YYYY or other common formats
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
      return `${MONTH_NAMES[month - 1] || 'Unknown'} ${day}, ${year}`;
    }
  }
  return dateStr;
}

function PatientProfile({ patient }) {
  if (!patient) return null;

  const {
    name,
    profile_picture,
    date_of_birth,
    gender,
    phone_number,
    emergency_contact,
    insurance_type,
    lab_results = [],
  } = patient;

  const fields = [
    { label: 'Date of Birth', value: formatDate(date_of_birth), key: 'date_of_birth' },
    { label: 'Gender', value: gender, key: 'gender' },
    { label: 'Contact Info', value: phone_number, key: 'phone_number' },
    { label: 'Emergency Contact', value: emergency_contact, key: 'emergency_contact' },
    { label: 'Insurance Provider', value: insurance_type, key: 'insurance_type' },
  ];

  return (
    <aside className={styles.container} aria-label="Patient Profile and Lab Results">
      {/* Patient Profile */}
      <section className={styles.card} aria-labelledby="profile-heading">
        <div className={styles.profileHeader}>
          {profile_picture ? (
            <RetinaImage
              src={profile_picture}
              alt={`${name}'s profile`}
              className={styles.avatarLarge}
              width={120}
              height={120}
            />
          ) : (
            <div className={styles.avatarLarge} aria-hidden="true" />
          )}
          <h2 id="profile-heading"><strong>{name}</strong></h2>
        </div>
        <div className={styles.infoList}>
          {fields.map(({ label, value, key }) => (
            <div key={key} className={styles.detailRow}>
              <div className={styles.iconWrapper}>
                {FIELD_ICONS[key] || (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="#072635" aria-hidden="true">
                    <circle cx="10" cy="10" r="2" />
                  </svg>
                )}
              </div>
              <div className={styles.textGroup}>
                <span className={styles.detailLabel}>{label}</span>
                <span className={styles.detailValue}>{value || '—'}</span>
              </div>
            </div>
          ))}
        </div>
        <button className={styles.showAllButton} type="button">
          Show All Information
        </button>
      </section>

      {/* Lab Results */}
      <section className={`${styles.card} ${styles.labCard}`} aria-labelledby="lab-results-heading">
        <h2 id="lab-results-heading"><strong>Lab Results</strong></h2>
        {lab_results.length === 0 ? (
          <p role="status" className={styles.emptyState}>No lab results available.</p>
        ) : (
          <div className={`${styles.labResultsViewport} custom-scrollbar`}>
            <ul className={styles.labList} role="list" aria-label="Downloadable lab results">
              {lab_results.map((result, idx) => (
                <li key={idx} className={styles.labItem}>
                  <span>{result}</span>
                  <button
                    className={styles.downloadIcon}
                    aria-label={`Download ${result}`}
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M8 1v9m0 0L4 6m4 4l4-4M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </aside>
  );
}

export default PatientProfile;
