import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RetinaImage from '../components/common/RetinaImage';

describe('RetinaImage', () => {
  it('renders an img element with the correct src', () => {
    render(<RetinaImage src="/assets/icon.png" alt="Search" />);
    const img = screen.getByRole('img', { name: 'Search' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/assets/icon.png');
  });

  it('generates srcSet for local assets (unhashed dev URL)', () => {
    render(<RetinaImage src="/assets/icon.png" alt="test" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('srcSet', '/assets/icon.png 1x, /assets/icon@2x.png 2x');
  });

  it('generates srcSet for hashed Vite build URLs', () => {
    render(<RetinaImage src="/assets/icon.abc123.png" alt="test" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('srcSet', '/assets/icon.abc123.png 1x, /assets/icon@2x.abc123.png 2x');
  });

  it('does not set srcSet for external URLs', () => {
    render(<RetinaImage src="https://example.com/photo.png" alt="external" />);
    const img = screen.getByRole('img');
    expect(img).not.toHaveAttribute('srcSet');
  });

  it('does not set srcSet when src already contains @2x', () => {
    render(<RetinaImage src="/assets/icon@2x.png" alt="test" />);
    const img = screen.getByRole('img');
    expect(img).not.toHaveAttribute('srcSet');
  });

  it('returns null when src is null', () => {
    const { container } = render(<RetinaImage src={null} alt="test" />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when src is undefined', () => {
    const { container } = render(<RetinaImage alt="test" />);
    expect(container.innerHTML).toBe('');
  });

  it('applies className, width, and height props', () => {
    render(
      <RetinaImage
        src="/assets/icon.png"
        alt="test"
        className="my-class"
        width={32}
        height={32}
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveClass('my-class');
    expect(img).toHaveAttribute('width', '32');
    expect(img).toHaveAttribute('height', '32');
  });

  it('sets loading="lazy" and decoding="async"', () => {
    render(<RetinaImage src="/assets/icon.png" alt="test" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
  });

  it('passes additional props to the img element', () => {
    render(<RetinaImage src="/assets/icon.png" alt="test" data-testid="custom" />);
    expect(screen.getByTestId('custom')).toBeInTheDocument();
  });

  it('handles URLs without an extension in insert2xSuffix', () => {
    render(<RetinaImage src="/assets/icon" alt="test" />);
    const img = screen.getByRole('img');
    // No extension means no @2x suffix can be inserted
    expect(img).toHaveAttribute('srcSet', '/assets/icon 1x, /assets/icon 2x');
  });
});
