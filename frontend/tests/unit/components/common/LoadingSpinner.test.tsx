/**
 * LoadingSpinner Component Tests
 * Tests for loading spinner rendering and messaging
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render spinner without message', () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
  });

  it('should render spinner with message', () => {
    render(<LoadingSpinner message="Loading projects..." />);

    const spinner = screen.getByRole('progressbar');
    const message = screen.getByText('Loading projects...');

    expect(spinner).toBeInTheDocument();
    expect(message).toBeInTheDocument();
  });

  it('should not render message when not provided', () => {
    render(<LoadingSpinner />);

    const message = screen.queryByText(/loading/i);
    expect(message).not.toBeInTheDocument();
  });

  it('should render with default size', () => {
    const { container } = render(<LoadingSpinner />);

    const spinner = container.querySelector('.MuiCircularProgress-root');
    expect(spinner).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('should render with custom size', () => {
    const { container } = render(<LoadingSpinner size={60} />);

    const spinner = container.querySelector('.MuiCircularProgress-root');
    expect(spinner).toHaveStyle({ width: '60px', height: '60px' });
  });

  it('should center the spinner and message', () => {
    const { container } = render(<LoadingSpinner message="Test" />);

    const box = container.firstChild as HTMLElement;
    expect(box).toHaveStyle({
      display: 'flex',
      'flex-direction': 'column',
      'align-items': 'center',
      'justify-content': 'center',
    });
  });
});
