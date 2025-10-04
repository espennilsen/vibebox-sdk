/**
 * StatusBadge Component Tests
 * Tests for status badge rendering and color coding
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { EnvironmentStatus } from '@/types';

describe('StatusBadge', () => {
  it('should render CREATING status with correct label and color', () => {
    render(<StatusBadge status="CREATING" />);

    const badge = screen.getByText('Creating');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.MuiChip-root')).toHaveClass('MuiChip-colorInfo');
  });

  it('should render RUNNING status with correct label and color', () => {
    render(<StatusBadge status="RUNNING" />);

    const badge = screen.getByText('Running');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
  });

  it('should render STOPPED status with correct label and color', () => {
    render(<StatusBadge status="STOPPED" />);

    const badge = screen.getByText('Stopped');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.MuiChip-root')).toHaveClass('MuiChip-colorDefault');
  });

  it('should render ERROR status with correct label and color', () => {
    render(<StatusBadge status="ERROR" />);

    const badge = screen.getByText('Error');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
  });

  it('should render DELETING status with correct label and color', () => {
    render(<StatusBadge status="DELETING" />);

    const badge = screen.getByText('Deleting');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');
  });

  it('should render with small size by default', () => {
    render(<StatusBadge status="RUNNING" />);

    const badge = screen.getByText('Running').closest('.MuiChip-root');
    expect(badge).toHaveClass('MuiChip-sizeSmall');
  });

  it('should render with medium size when specified', () => {
    render(<StatusBadge status="RUNNING" size="medium" />);

    const badge = screen.getByText('Running').closest('.MuiChip-root');
    expect(badge).toHaveClass('MuiChip-sizeMedium');
  });

  it('should handle all status types correctly', () => {
    const statuses: EnvironmentStatus[] = ['CREATING', 'RUNNING', 'STOPPED', 'ERROR', 'DELETING'];
    const expectedLabels = ['Creating', 'Running', 'Stopped', 'Error', 'Deleting'];

    statuses.forEach((status, index) => {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(screen.getByText(expectedLabels[index])).toBeInTheDocument();
      unmount();
    });
  });
});
