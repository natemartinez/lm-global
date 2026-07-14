import { Suspense, lazy, useState, useCallback } from 'react';
import styles from './DiagnosisView.module.css';
import { RetinaImage, ErrorBoundary } from '@components/common';
import respiratoryIcon from '@assets/respiratory rate/respiratory rate.png';
import temperatureIcon from '@assets/temperature/temperature.png';
import heartBpmIcon from '@assets/HeartBPM/HeartBPM.png';

const BloodPressureChart = lazy(() => import('./BloodPressureChart'));

/**
 * Get the most recent diagnosis history entry.
 */
function getLatestEntry(history) {
  if (!history || history.length === 0) return null;
  return history.reduce((latest, entry) => {
    const entryDate = new Date(entry.year, getMonthIndex(entry.month));
    const latestDate = new Date(latest.year, getMonthIndex(latest.month));
    return entryDate > latestDate ? entry : latest;
  });
}

function getMonthIndex(month) {
  const months = {
    January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
  };
  return months[month] ?? 0;
}

function DiagnosisView({ diagnosisHistory = [], diagnosticList = [] }) {
  const [range, setRange] = useState(6);
  const latest = getLatestEntry(diagnosisHistory);

  const systolic = latest?.blood_pressure?.systolic;
  const diastolic = latest?.blood_pressure?.diastolic;

  const handleRangeChange = useCallback((value) => {
    setRange(value);
  }, []);

  return (
    <div className={styles.container}>
      <section className={styles.card} aria-labelledby="diagnosis-history-heading">
        <h2 id="diagnosis-history-heading" style={{ marginBottom: '1.25rem' }}><strong>Diagnosis History</strong></h2>

        <div aria-label={`Blood pressure chart, last ${range} months`}>
          <ErrorBoundary fallback={<div role="alert" className={styles.chartFallback}>Chart failed to load.</div>}>
            <Suspense fallback={<div className={styles.chartFallback}>Loading chart data...</div>}>
              <BloodPressureChart
                diagnosisHistory={diagnosisHistory}
                range={range}
                onRangeChange={handleRangeChange}
                systolic={systolic}
                diastolic={diastolic}
              />
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* CSS Grid Layout for Diagnosis Report */}
        <div className={styles.metricsGrid}>
          <article className={`${styles.metricBox} ${styles.respiratory}`} aria-label="Respiratory rate metric">
            <RetinaImage
              src={respiratoryIcon}
              alt=""
              className={styles.metricIcon}
              width={60}
              height={60}
            />
            <h3 className={styles.metricTitle}>Respiratory Rate</h3>
            <strong className={styles.metricValue} aria-label={`Respiratory rate: ${latest?.respiratory_rate?.value ?? 'N/A'} bpm`}>
              {latest?.respiratory_rate?.value ?? 'N/A'} bpm
            </strong>
            <p className={styles.metricStatus}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#07263E" aria-hidden="true" style={{ marginRight: '4px' }}>
                <path d="M12 4l-8 8h16z" />
              </svg>
              <span style={{ fontWeight: 700 }}>{latest?.respiratory_rate?.levels ?? ''}</span>
            </p>
          </article>

          <article className={`${styles.metricBox} ${styles.temperature}`} aria-label="Temperature metric">
            <RetinaImage
              src={temperatureIcon}
              alt=""
              className={styles.metricIcon}
              width={60}
              height={60}
            />
            <h3 className={styles.metricTitle}>Temperature</h3>
            <strong className={styles.metricValue} aria-label={`Temperature: ${latest?.temperature?.value ?? 'N/A'}°F`}>
              {latest?.temperature?.value ?? 'N/A'}°F
            </strong>
            <p className={styles.metricStatus}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#07263E" aria-hidden="true" style={{ marginRight: '4px' }}>
                <path d="M12 4l-8 8h16z" />
              </svg>
              <span style={{ fontWeight: 700 }}>{latest?.temperature?.levels ?? ''}</span>
            </p>
          </article>

          <article className={`${styles.metricBox} ${styles.heartRate}`} aria-label="Heart rate metric">
            <RetinaImage
              src={heartBpmIcon}
              alt=""
              className={styles.metricIcon}
              width={60}
              height={60}
            />
            <h3 className={styles.metricTitle}>Heart Rate</h3>
            <strong className={styles.metricValue} aria-label={`Heart rate: ${latest?.heart_rate?.value ?? 'N/A'} bpm`}>
              {latest?.heart_rate?.value ?? 'N/A'} bpm
            </strong>
            <p className={styles.metricStatus}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#07263E" aria-hidden="true" style={{ marginRight: '4px' }}>
                <path d="M12 20l8-8H4z" />
              </svg>
              <span style={{ fontWeight: 700 }}>{latest?.heart_rate?.levels ?? ''}</span>
            </p>
          </article>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="diagnostic-list-heading">
        <h2 id="diagnostic-list-heading"><strong>Diagnostic List</strong></h2>
        {diagnosticList.length === 0 ? (
          <p role="status" className={styles.emptyState}>No diagnostic records available.</p>
        ) : (
          <div className={`${styles.diagnosticTableViewport} custom-scrollbar`}>
            <table className={styles.table} aria-label="List of patient conditions">
              <thead>
                <tr>
                  <th scope="col">Problem/Diagnosis</th>
                  <th scope="col">Description</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {diagnosticList.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.name}</td>
                    <td>{item.description}</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default DiagnosisView;
