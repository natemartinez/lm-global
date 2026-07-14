import { useId, useCallback } from 'react';
import styles from './PatientList.module.css';
import { RetinaImage } from '@components/common';
import searchIcon from '@assets/search_FILL0_wght300_GRAD0_opsz24/search_FILL0_wght300_GRAD0_opsz24.png';

function PatientList({ patients = [], selectedPatientId, onPatientSelect }) {
  const listId = useId();

  const handleKeyDown = useCallback(
    (e, name) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPatientSelect(name);
      }
    },
    [onPatientSelect]
  );

  return (
    <section className={styles.container} aria-label="Patient Directory">
      <div className={styles.headingRow}>
        <h2 className={styles.heading}>
          <strong>Patients</strong>
        </h2>
        <RetinaImage
          src={searchIcon}
          alt=""
          className={styles.searchIcon}
          width={16}
          height={16}
        />
      </div>
      {patients.length === 0 ? (
        <p role="status" className={styles.emptyState}>
          No patients found.
        </p>
      ) : (
        <ul id={listId} className={`${styles.list} custom-scrollbar`} role="listbox" aria-label="Patient list">
          {patients.map((patient) => {
            const isSelected = patient.name === selectedPatientId;
            return (
              <li
                key={patient.name}
                className={`${styles.item} ${isSelected ? styles.selected : ''}`}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => onPatientSelect(patient.name)}
                onKeyDown={(e) => handleKeyDown(e, patient.name)}
              >
                {patient.profile_picture ? (
                  <RetinaImage
                    src={patient.profile_picture}
                    alt=""
                    className={styles.avatar}
                    width={40}
                    height={40}
                  />
                ) : (
                  <div className={styles.avatar} aria-hidden="true" />
                )}
                <div className={styles.details}>
                  <strong>{patient.name}</strong>
                  <br />
                  <span className={styles.meta}>
                    {patient.gender}, {patient.age}
                  </span>
                </div>
                <button
                  className={styles.menuButton}
                  aria-label={`Options for ${patient.name}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Future: open contextual menu
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <circle cx="3" cy="8" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="13" cy="8" r="1.5" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default PatientList;
