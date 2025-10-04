/**
 * EmptyState Component Tests
 * Tests for empty state display with icons, titles, descriptions, and actions
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '@/components/common/EmptyState';
import { FolderOpen } from '@mui/icons-material';

describe('EmptyState', () => {
  it('should render with only title', () => {
    render(<EmptyState title="No items found" />);

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should render with title and description', () => {
    render(<EmptyState title="No projects" description="Create your first project to get started" />);

    expect(screen.getByText('No projects')).toBeInTheDocument();
    expect(screen.getByText('Create your first project to get started')).toBeInTheDocument();
  });

  it('should render with icon', () => {
    const { container } = render(
      <EmptyState icon={FolderOpen} title="No projects" />
    );

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should not render icon when not provided', () => {
    const { container } = render(<EmptyState title="No items" />);

    const icon = container.querySelector('svg');
    expect(icon).not.toBeInTheDocument();
  });

  it('should render action button when actionText and onAction provided', () => {
    const onAction = vi.fn();
    render(
      <EmptyState title="No projects" actionText="Create Project" onAction={onAction} />
    );

    const button = screen.getByRole('button', { name: 'Create Project' });
    expect(button).toBeInTheDocument();
  });

  it('should call onAction when action button clicked', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <EmptyState title="No projects" actionText="Create Project" onAction={onAction} />
    );

    const button = screen.getByRole('button', { name: 'Create Project' });
    await user.click(button);

    expect(onAction).toHaveBeenCalledOnce();
  });

  it('should not render action button when only actionText provided', () => {
    render(<EmptyState title="No items" actionText="Create" />);

    const button = screen.queryByRole('button');
    expect(button).not.toBeInTheDocument();
  });

  it('should not render action button when only onAction provided', () => {
    const onAction = vi.fn();
    render(<EmptyState title="No items" onAction={onAction} />);

    const button = screen.queryByRole('button');
    expect(button).not.toBeInTheDocument();
  });

  it('should render complete empty state with all props', () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        icon={FolderOpen}
        title="No projects yet"
        description="Get started by creating your first project"
        actionText="Create Project"
        onAction={onAction}
      />
    );

    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating your first project')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Project' })).toBeInTheDocument();
  });

  it('should center content', () => {
    const { container } = render(<EmptyState title="Test" />);

    const box = container.firstChild as HTMLElement;
    expect(box).toHaveStyle({
      display: 'flex',
      'flex-direction': 'column',
      'align-items': 'center',
      'justify-content': 'center',
      'text-align': 'center',
    });
  });
});
