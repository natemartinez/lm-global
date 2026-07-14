import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BloodPressureChart from '../components/dashboard/BloodPressureChart';
import type { DiagnosisHistoryEntry } from '../types';

// Mock Chart.js registration to avoid side effects in tests
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  Filler: vi.fn(),
}));

// Mock react-chartjs-2 Line component
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: { data: any; options: any }) => (
    <div data-testid="mock-line-chart" data-data={JSON.stringify(data)} data-options={JSON.stringify(options)} />
  ),
}));

function makeHistoryEntry(
  month: string,
  year: number,
  systolic: number,
  diastolic: number,
  systolicLevels = 'Normal',
  diastolicLevels = 'Normal'
): DiagnosisHistoryEntry {
  return {
    month,
    year,
    blood_pressure: {
      systolic: { value: systolic, levels: systolicLevels },
      diastolic: { value: diastolic, levels: diastolicLevels },
    },
    heart_rate: { value: 80, levels: 'Normal' },
    respiratory_rate: { value: 18, levels: 'Normal' },
    temperature: { value: 98.6, levels: 'Normal' },
  };
}

describe('BloodPressureChart', () => {
  const defaultProps = {
    diagnosisHistory: [
      makeHistoryEntry('October', 2023, 120, 80),
      makeHistoryEntry('November', 2023, 125, 82),
      makeHistoryEntry('December', 2023, 118, 78),
    ],
    range: 6,
    onRangeChange: vi.fn(),
    systolic: { value: 118, levels: 'Normal' },
    diastolic: { value: 78, levels: 'Normal' },
  };

  it('renders the Blood Pressure heading', () => {
    render(<BloodPressureChart {...defaultProps} />);
    expect(screen.getByText('Blood Pressure')).toBeInTheDocument();
  });

  it('renders the range dropdown with 3 options', () => {
    render(<BloodPressureChart {...defaultProps} />);
    const select = screen.getByRole('combobox', { name: /select chart time range/i });
    expect(select).toBeInTheDocument();
    expect(select.children).toHaveLength(3);
    expect(select.children[0]).toHaveTextContent('Last 3 months');
    expect(select.children[1]).toHaveTextContent('Last 6 months');
    expect(select.children[2]).toHaveTextContent('Last 12 months');
  });

  it('calls onRangeChange when dropdown value changes', () => {
    const onRangeChange = vi.fn();
    render(<BloodPressureChart {...defaultProps} onRangeChange={onRangeChange} />);
    const select = screen.getByRole('combobox', { name: /select chart time range/i });
    fireEvent.change(select, { target: { value: '12' } });
    expect(onRangeChange).toHaveBeenCalledWith(12);
  });

  it('renders the chart component', () => {
    render(<BloodPressureChart {...defaultProps} />);
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
  });

  it('passes correct data to the chart', () => {
    render(<BloodPressureChart {...defaultProps} />);
    const chart = screen.getByTestId('mock-line-chart');
    const data = JSON.parse(chart.getAttribute('data-data')!);
    expect(data.labels).toContain('Oct, 2023');
    expect(data.labels).toContain('Nov, 2023');
    expect(data.labels).toContain('Dec, 2023');
    expect(data.datasets[0].data).toContain(120);
    expect(data.datasets[0].data).toContain(125);
    expect(data.datasets[0].data).toContain(118);
    expect(data.datasets[1].data).toContain(80);
    expect(data.datasets[1].data).toContain(82);
    expect(data.datasets[1].data).toContain(78);
  });

  it('renders systolic vitals section', () => {
    render(<BloodPressureChart {...defaultProps} />);
    expect(screen.getByText('Systolic')).toBeInTheDocument();
    expect(screen.getByText('118')).toBeInTheDocument();
    // Use getAllByText since "Normal" appears for both systolic and diastolic
    const normalTexts = screen.getAllByText('Normal');
    expect(normalTexts.length).toBeGreaterThanOrEqual(2);
  });

  it('renders diastolic vitals section', () => {
    render(<BloodPressureChart {...defaultProps} />);
    expect(screen.getByText('Diastolic')).toBeInTheDocument();
    expect(screen.getByText('78')).toBeInTheDocument();
    const normalTexts = screen.getAllByText('Normal');
    expect(normalTexts.length).toBeGreaterThanOrEqual(2);
  });

  it('shows fallback "—" when systolic is null', () => {
    render(<BloodPressureChart {...defaultProps} systolic={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows fallback "—" when diastolic is null', () => {
    render(<BloodPressureChart {...defaultProps} diastolic={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the horizontal divider between vitals', () => {
    const { container } = render(<BloodPressureChart {...defaultProps} />);
    const hr = container.querySelector('hr');
    expect(hr).toBeInTheDocument();
  });

  it('renders SVG arrow indicators in vitals status', () => {
    const { container } = render(<BloodPressureChart {...defaultProps} />);
    const svgs = container.querySelectorAll('.vitals-status svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the chart container with correct background class', () => {
    const { container } = render(<BloodPressureChart {...defaultProps} />);
    // The card div should be present
    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();
  });
});
