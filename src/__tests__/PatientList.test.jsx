import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PatientList from '../components/dashboard/PatientList';

const mockPatients = [
  {
    name: 'Jessica Taylor',
    gender: 'Female',
    age: 28,
    profile_picture: 'https://example.com/jessica.png',
  },
  {
    name: 'John Smith',
    gender: 'Male',
    age: 45,
    profile_picture: null,
  },
  {
    name: 'Emily Davis',
    gender: 'Female',
    age: 35,
    profile_picture: 'https://example.com/emily.png',
  },
];

describe('PatientList', () => {
  it('renders all patients', () => {
    render(<PatientList patients={mockPatients} />);
    expect(screen.getByText('Jessica Taylor')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Emily Davis')).toBeInTheDocument();
  });

  it('shows gender and age for each patient', () => {
    render(<PatientList patients={mockPatients} />);
    expect(screen.getByText('Female, 28')).toBeInTheDocument();
    expect(screen.getByText('Male, 45')).toBeInTheDocument();
    expect(screen.getByText('Female, 35')).toBeInTheDocument();
  });

  it('highlights the selected patient', () => {
    render(
      <PatientList
        patients={mockPatients}
        selectedPatientId="Jessica Taylor"
      />
    );
    const items = screen.getAllByRole('option');
    const selectedItem = items.find(
      (item) => item.getAttribute('aria-selected') === 'true'
    );
    expect(selectedItem).toHaveTextContent('Jessica Taylor');
  });

  it('calls onPatientSelect on click', () => {
    const onPatientSelect = vi.fn();
    render(
      <PatientList
        patients={mockPatients}
        onPatientSelect={onPatientSelect}
      />
    );
    fireEvent.click(screen.getByText('Jessica Taylor'));
    expect(onPatientSelect).toHaveBeenCalledWith('Jessica Taylor');
  });

  it('calls onPatientSelect on Enter key', () => {
    const onPatientSelect = vi.fn();
    render(
      <PatientList
        patients={mockPatients}
        onPatientSelect={onPatientSelect}
      />
    );
    const items = screen.getAllByRole('option');
    fireEvent.keyDown(items[0], { key: 'Enter' });
    expect(onPatientSelect).toHaveBeenCalledWith('Jessica Taylor');
  });

  it('calls onPatientSelect on Space key', () => {
    const onPatientSelect = vi.fn();
    render(
      <PatientList
        patients={mockPatients}
        onPatientSelect={onPatientSelect}
      />
    );
    const items = screen.getAllByRole('option');
    fireEvent.keyDown(items[0], { key: ' ' });
    expect(onPatientSelect).toHaveBeenCalledWith('Jessica Taylor');
  });

  it('shows empty state when no patients', () => {
    render(<PatientList patients={[]} />);
    expect(screen.getByText('No patients found.')).toBeInTheDocument();
  });

  it('renders avatar image when profile_picture exists', () => {
    const { container } = render(<PatientList patients={[mockPatients[0]]} />);
    // Images with alt="" are presentation role, not accessible img role.
    // Use container.querySelectorAll to find all <img> elements.
    const imgs = container.querySelectorAll('img');
    // The avatar is the img inside the list item; it should have src set
    const avatarImg = Array.from(imgs).find((img) => img.closest('li') !== null);
    expect(avatarImg).toBeInTheDocument();
    expect(avatarImg).toHaveAttribute('src', 'https://example.com/jessica.png');
  });

  it('renders placeholder div when no profile_picture', () => {
    const { container } = render(<PatientList patients={[mockPatients[1]]} />);
    // The avatar div with aria-hidden="true" should exist
    const placeholder = container.querySelector('[aria-hidden="true"]');
    expect(placeholder).toBeInTheDocument();
  });

  it('renders three-dot menu button per patient', () => {
    render(<PatientList patients={mockPatients} />);
    const buttons = screen.getAllByRole('button', { name: /options for/i });
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveAttribute('aria-label', 'Options for Jessica Taylor');
  });

  it('uses role="listbox" on the list', () => {
    render(<PatientList patients={mockPatients} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('uses role="option" on each item', () => {
    render(<PatientList patients={mockPatients} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
  });
});
