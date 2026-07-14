import styles from './BloodPressureChart.module.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { DiagnosisHistoryEntry } from '../../types';

// Register Chart.js components once at module level
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface BpReading {
  value: number;
  levels: string;
}

interface BloodPressureChartProps {
  diagnosisHistory: DiagnosisHistoryEntry[];
  /** Number of months of history to display (default: 6). */
  range: number;
  /** Callback when the range dropdown changes. */
  onRangeChange: (value: number) => void;
  /** Latest systolic reading for the inline legend. */
  systolic?: BpReading | null;
  /** Latest diastolic reading for the inline legend. */
  diastolic?: BpReading | null;
}

/**
 * Compute an array of { month, year } pairs going back `count` months
 * from the latest entry in the diagnosis history.
 */
function computeMonthRange(history: DiagnosisHistoryEntry[], count: number): { month: string; year: number }[] {
  if (history.length === 0) return [];

  // Find the latest month/year in the data
  let latestIdx = 0;
  let latestDate = new Date(0);
  for (let i = 0; i < history.length; i++) {
    const d = new Date(history[i].year, MONTH_NAMES.indexOf(history[i].month));
    if (d > latestDate) {
      latestDate = d;
      latestIdx = i;
    }
  }

  const endMonth = MONTH_NAMES.indexOf(history[latestIdx].month);
  const endYear = history[latestIdx].year;

  const pairs: { month: string; year: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    let m = endMonth - i;
    let y = endYear;
    while (m < 0) { m += 12; y -= 1; }
    pairs.push({ month: MONTH_NAMES[m], year: y });
  }
  return pairs;
}

/**
 * BloodPressureChart renders a dual-line Chart.js chart showing
 * systolic and diastolic blood pressure readings over a configurable
 * time range.
 *
 * Styling matches the design spec:
 * - Systolic line: #E66FD2 (pink)
 * - Diastolic line: #8C6FE6 (purple)
 * - Y-axis: 60–180 range with 20-unit ticks
 * - X-axis: month labels
 */
const RANGE_OPTIONS = [
  { value: 3, label: 'Last 3 months' },
  { value: 6, label: 'Last 6 months' },
  { value: 12, label: 'Last 12 months' },
];

export default function BloodPressureChart({ diagnosisHistory, range, onRangeChange, systolic, diastolic }: BloodPressureChartProps) {
  // Build a lookup map: "Month Year" -> entry
  const historyMap = new Map<string, DiagnosisHistoryEntry>();
  for (const entry of diagnosisHistory) {
    historyMap.set(`${entry.month} ${entry.year}`, entry);
  }

  // Build labels and data in chronological order
  const labels: string[] = [];
  const systolicData: number[] = [];
  const diastolicData: number[] = [];

  const monthYearPairs = computeMonthRange(diagnosisHistory, range);

  for (const { month, year } of monthYearPairs) {
    const key = `${month} ${year}`;
    const entry = historyMap.get(key);
    // Use full month abbreviation + year for x-axis labels
    labels.push(`${month.slice(0, 3)}, ${year}`);
    systolicData.push(entry?.blood_pressure.systolic.value ?? 0);
    diastolicData.push(entry?.blood_pressure.diastolic.value ?? 0);
  }

  const data = {
    labels,
    datasets: [
      {
        label: 'Systolic',
        data: systolicData,
        borderColor: '#E66FD2',
        backgroundColor: '#E66FD2',
        pointBackgroundColor: '#E66FD2',
        pointBorderColor: '#E66FD2',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Diastolic',
        data: diastolicData,
        borderColor: '#8C6FE6',
        backgroundColor: '#8C6FE6',
        pointBackgroundColor: '#8C6FE6',
        pointBorderColor: '#8C6FE6',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
        tension: 0.3,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // We render a custom legend in DiagnosisView
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 13,
            family: 'Manrope',
          },
          maxRotation: 0,
        },
      },
      y: {
        min: 60,
        max: 180,
        ticks: {
          stepSize: 20,
          font: {
            size: 13,
            family: 'Manrope',
          },
        },
        grid: {
          color: '#f0f0f0',
        },
      },
    },
  };

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onRangeChange(Number(e.target.value));
  };

  return (
    <div className={styles.card}>
      {/* LEFT COLUMN: Chart & Header */}
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#07263E', margin: 0 }}>Blood Pressure</h2>
          <div className="dropdown-filter" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#07263E', cursor: 'pointer' }}>
            <select
              value={range}
              onChange={handleSelect}
              aria-label="Select chart time range"
              style={{
                fontSize: '14px',
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 500,
                padding: '4px 8px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                color: '#07263E',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.chartBody} role="img" aria-label={`Blood pressure chart showing systolic and diastolic readings over the last ${range} months`}>
          <Line data={data} options={options} />
        </div>
      </div>

      {/* RIGHT COLUMN: Vitals Summary */}
      <div className={styles.vitalsSummary}>
        {/* Systolic Section */}
        <div className="vitals-block systolic" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="vitals-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#E66FD2', display: 'inline-block', flexShrink: 0 }} />
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#07263E', margin: 0 }}>Systolic</h3>
          </div>
          <div className="vitals-value" style={{ fontSize: '22px', fontWeight: 700, color: '#07263E' }}>{systolic?.value ?? '—'}</div>
          <div className="vitals-status" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#07263E' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#07263E" aria-hidden="true">
              <path d="M12 4l-8 8h16z" />
            </svg>
            <span style={{ fontWeight: 700 }}>{systolic?.levels ?? ''}</span>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid #CBC8D4', margin: '16px 0', width: '100%' }} />

        {/* Diastolic Section */}
        <div className="vitals-block diastolic" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="vitals-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#8C6FE6', display: 'inline-block', flexShrink: 0 }} />
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#07263E', margin: 0 }}>Diastolic</h3>
          </div>
          <div className="vitals-value" style={{ fontSize: '22px', fontWeight: 700, color: '#07263E' }}>{diastolic?.value ?? '—'}</div>
          <div className="vitals-status" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#07263E' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#07263E" aria-hidden="true">
              <path d="M12 20l8-8H4z" />
            </svg>
            <span style={{ fontWeight: 700 }}>{diastolic?.levels ?? ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
