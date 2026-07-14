import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '../components/layout/Header';

describe('Header', () => {
  it('renders the logo with alt text "Tech Care"', () => {
    render(<Header />);
    const logo = screen.getByRole('img', { name: 'Tech Care' });
    expect(logo).toBeInTheDocument();
  });

  it('renders 5 nav items', () => {
    render(<Header />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Patients')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  it('highlights the active nav item (Patients)', () => {
    const { container } = render(<Header />);
    const navItems = container.querySelectorAll('li');
    const activeItem = Array.from(navItems).find(
      (li) => li.textContent?.includes('Patients')
    );
    expect(activeItem?.className).toContain('active');
  });

  it('renders doctor name and title', () => {
    render(<Header />);
    expect(screen.getByText('Dr. Jose Simmons')).toBeInTheDocument();
    expect(screen.getByText('General Practitioner')).toBeInTheDocument();
  });

  it('renders doctor avatar with alt text', () => {
    render(<Header />);
    const avatar = screen.getByRole('img', { name: 'Dr. Jose Simmons' });
    expect(avatar).toBeInTheDocument();
  });

  it('renders settings button with aria-label', () => {
    render(<Header />);
    expect(
      screen.getByRole('button', { name: /settings/i })
    ).toBeInTheDocument();
  });

  it('renders more options button with aria-label', () => {
    render(<Header />);
    expect(
      screen.getByRole('button', { name: /more options/i })
    ).toBeInTheDocument();
  });

  it('renders nav with aria-label "Main Navigation"', () => {
    render(<Header />);
    expect(
      screen.getByRole('navigation', { name: /main navigation/i })
    ).toBeInTheDocument();
  });

  it('renders header with role="banner"', () => {
    render(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
