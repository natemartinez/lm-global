import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PatientProfile from '../components/dashboard/PatientProfile';

const mockPatient = {
  name: 'Jessica Taylor',
  profile_picture: 'https://example.com/jessica.png',
  date_of_birth: '08/23/1996',
  gender: 'Female',
  phone_number: '(555) 123-4567',
  emergency_contact: '(555) 987-6543',
  insurance_type: 'Sunrise Health',
  lab_results: ['Blood Test', 'X-Ray', 'MRI Scan'],
};

describe('PatientProfile', () => {
  it('renders the patient name', () => {
    render(<PatientProfile patient={mockPatient} />);
    expect(screen.getByText('Jessica Taylor')).toBeInTheDocument();
  });

  it('renders profile picture with alt text', () => {
    render(<PatientProfile patient={mockPatient} />);
    const img = screen.getByRole('img', { name: /jessica taylor's profile/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/jessica.png');
  });

  it('renders all 5 info fields', () => {
    render(<PatientProfile patient={mockPatient} />);
    expect(screen.getByText('Date of Birth')).toBeInTheDocument();
    expect(screen.getByText('Gender')).toBeInTheDocument();
    expect(screen.getByText('Contact Info')).toBeInTheDocument();
    expect(screen.getByText('Emergency Contact')).toBeInTheDocument();
    expect(screen.getByText('Insurance Provider')).toBeInTheDocument();
  });

  it('formats date correctly', () => {
    render(<PatientProfile patient={mockPatient} />);
    expect(screen.getByText('August 23, 1996')).toBeInTheDocument();
  });

  it('shows fallback "—" for missing fields', () => {
    const patientWithMissingFields = {
      ...mockPatient,
      date_of_birth: undefined,
      phone_number: undefined,
    };
    render(<PatientProfile patient={patientWithMissingFields} />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('renders lab results list', () => {
    render(<PatientProfile patient={mockPatient} />);
    expect(screen.getByText('Blood Test')).toBeInTheDocument();
    expect(screen.getByText('X-Ray')).toBeInTheDocument();
    expect(screen.getByText('MRI Scan')).toBeInTheDocument();
  });

  it('shows empty state for no lab results', () => {
    const patientNoLabs = { ...mockPatient, lab_results: [] };
    render(<PatientProfile patient={patientNoLabs} />);
    expect(screen.getByText('No lab results available.')).toBeInTheDocument();
  });

  it('renders download buttons with correct aria-labels', () => {
    render(<PatientProfile patient={mockPatient} />);
    const downloadBtn = screen.getByRole('button', { name: /download blood test/i });
    expect(downloadBtn).toBeInTheDocument();
  });

  it('returns null when patient is null', () => {
    const { container } = render(<PatientProfile patient={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders "Show All Information" button', () => {
    render(<PatientProfile patient={mockPatient} />);
    expect(
      screen.getByRole('button', { name: /show all information/i })
    ).toBeInTheDocument();
  });
});
