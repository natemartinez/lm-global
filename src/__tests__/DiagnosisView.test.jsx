import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DiagnosisView from '../components/dashboard/DiagnosisView';

// Mock the lazy-loaded BloodPressureChart
vi.mock('../components/dashboard/BloodPressureChart', () => ({
  default: ({ range, systolic, diastolic }) => (
    <div data-testid="mock-bp-chart" data-range={range}>
      <div>Systolic: {systolic?.value}</div>
      <div>Diastolic: {diastolic?.value}</div>
    </div>
  ),
}));

const mockHistory = [
  {
    month: 'October',
    year: 2023,
    blood_pressure: { systolic: { value: 120, levels: 'Normal' }, diastolic: { value: 80, levels: 'Normal' } },
    heart_rate: { value: 78, levels: 'Normal' },
    respiratory_rate: { value: 16, levels: 'Normal' },
    temperature: { value: 98.6, levels: 'Normal' },
  },
];

const mockDiagnosticList = [
  { name: 'Hypertension', description: 'Chronic high blood pressure', status: 'Under Observation' },
  { name: 'Type 2 Diabetes', description: 'Insulin resistance', status: 'Cured' },
];

describe('DiagnosisView', () => {
  it('renders the Diagnosis History heading', () => {
    render(<DiagnosisView diagnosisHistory={mockHistory} diagnosticList={mockDiagnosticList} />);
    expect(screen.getByText('Diagnosis History')).toBeInTheDocument();
  });

  it('renders 3 metric cards', () => {
    render(<DiagnosisView diagnosisHistory={mockHistory} diagnosticList={mockDiagnosticList} />);
    expect(screen.getByRole('article', { name: /respiratory rate metric/i })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /temperature metric/i })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /heart rate metric/i })).toBeInTheDocument();
  });

  it('shows metric values from latest entry', () => {
    render(<DiagnosisView diagnosisHistory={mockHistory} diagnosticList={mockDiagnosticList} />);
    expect(screen.getByText('16 bpm')).toBeInTheDocument();
    expect(screen.getByText('98.6°F')).toBeInTheDocument();
    expect(screen.getByText('78 bpm')).toBeInTheDocument();
  });

  it('shows metric status text', () => {
    render(<DiagnosisView diagnosisHistory={mockHistory} diagnosticList={mockDiagnosticList} />);
    const statuses = screen.getAllByText('Normal');
    expect(statuses.length).toBeGreaterThanOrEqual(3);
  });

  it('renders the diagnostic list table', () => {
    render(<DiagnosisView diagnosisHistory={mockHistory} diagnosticList={mockDiagnosticList} />);
    expect(screen.getByText('Hypertension')).toBeInTheDocument();
    expect(screen.getByText('Type 2 Diabetes')).toBeInTheDocument();
    expect(screen.getByText('Under Observation')).toBeInTheDocument();
    expect(screen.getByText('Cured')).toBeInTheDocument();
  });

  it('shows empty state for no diagnostics', () => {
    render(<DiagnosisView diagnosisHistory={mockHistory} diagnosticList={[]} />);
    expect(screen.getByText('No diagnostic records available.')).toBeInTheDocument();
  });

  it('renders the BloodPressureChart with correct range', () => {
    render(<DiagnosisView diagnosisHistory={mockHistory} diagnosticList={mockDiagnosticList} />);
    const chart = screen.getByTestId('mock-bp-chart');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveAttribute('data-range', '6');
  });

  it('renders the Diagnostic List heading', () => {
    render(<DiagnosisView diagnosisHistory={mockHistory} diagnosticList={mockDiagnosticList} />);
    expect(screen.getByText('Diagnostic List')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<DiagnosisView diagnosisHistory={mockHistory} diagnosticList={mockDiagnosticList} />);
    expect(screen.getByText('Problem/Diagnosis')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });
});
