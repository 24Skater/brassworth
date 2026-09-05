import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemStatusBadge } from '@/components/items/ItemStatusBadge';
import { ValueBreakdown } from '@/components/ValueBreakdown';
import { EmptyState } from '@/components/common/EmptyState';
import { SkipLink } from '@/components/common/SkipLink';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PermissionGate } from '@/components/PermissionGate';
import { RoleSelect } from '@/components/users/RoleSelect';
import type { Breakdown } from '@/lib/reporting';
import type { ItemStatus } from '@/types';
import { Package } from 'lucide-react';

vi.mock('@/contexts/RolesContext', () => ({
  usePermission: vi.fn(() => true),
  useRoles: vi.fn(() => ({ currentRole: 'ADMIN' })),
}));

describe('ItemStatusBadge', () => {
  const statuses: ItemStatus[] = ['IN_POSSESSION', 'LOANED', 'IN_REPAIR', 'BROKEN', 'SOLD', 'LOST'];

  it.each(statuses)('renders a readable label for %s', (status) => {
    render(<ItemStatusBadge status={status} />);
    // Every status must say something; none may render blank.
    expect(screen.getByText(/\w/)).toBeInTheDocument();
  });

  it('says Overdue rather than Loaned out when a loan is late', () => {
    render(<ItemStatusBadge status="LOANED" overdue />);

    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.queryByText('Loaned out')).not.toBeInTheDocument();
  });

  it('ignores overdue for a status where it makes no sense', () => {
    render(<ItemStatusBadge status="SOLD" overdue />);
    expect(screen.getByText('Sold')).toBeInTheDocument();
  });
});

describe('ValueBreakdown', () => {
  const rows: Breakdown[] = [
    { key: 'Milwaukee', count: 3, purchaseTotal: 900, currentTotal: 700 },
    { key: 'DeWalt', count: 1, purchaseTotal: 200, currentTotal: 150 },
  ];

  it('shows the category tab first', () => {
    render(<ValueBreakdown byCategory={rows} byLocation={[]} byBrand={[]} />);

    expect(screen.getByText('Milwaukee')).toBeInTheDocument();
    expect(screen.getByText(/700\.00/)).toBeInTheDocument();
  });

  it('switches to the brand tab', async () => {
    const user = userEvent.setup();
    render(<ValueBreakdown byCategory={[]} byLocation={[]} byBrand={rows} />);

    await user.click(screen.getByRole('tab', { name: /brand/i }));

    expect(screen.getByText('Milwaukee')).toBeInTheDocument();
  });

  it('pluralises the item count', () => {
    render(<ValueBreakdown byCategory={rows} byLocation={[]} byBrand={[]} />);

    expect(screen.getByText(/3 items/)).toBeInTheDocument();
    expect(screen.getByText(/1 item(?!s)/)).toBeInTheDocument();
  });

  it('says so when a tab has nothing in it', () => {
    render(<ValueBreakdown byCategory={[]} byLocation={[]} byBrand={[]} />);
    expect(screen.getByText(/no items yet/i)).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders its message and action', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <EmptyState
        icon={Package}
        title="Nothing here"
        description="Add something to get started"
        action={{ label: 'Add one', onClick: onAction }}
      />
    );

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Add something to get started')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add one' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders without an action', () => {
    render(<EmptyState icon={Package} title="Nothing here" description="Quiet in here" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('SkipLink', () => {
  it('points at the main content, for keyboard users', () => {
    render(<SkipLink />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', expect.stringContaining('#'));
  });
});

describe('ErrorBoundary', () => {
  function Boom(): JSX.Element {
    throw new Error('Something broke');
  }

  it('renders its children when nothing goes wrong', () => {
    render(
      <ErrorBoundary>
        <p>All fine</p>
      </ErrorBoundary>
    );

    expect(screen.getByText('All fine')).toBeInTheDocument();
  });

  it('catches a thrown render error instead of taking the app down', () => {
    // React logs the error itself; silence it so the run stays readable.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe('PermissionGate', () => {
  it('renders children when the permission is held', () => {
    render(
      <PermissionGate permission="canAddItems">
        <p>Allowed</p>
      </PermissionGate>
    );

    expect(screen.getByText('Allowed')).toBeInTheDocument();
  });
});

describe('RoleSelect', () => {
  it('shows the current role', () => {
    render(<RoleSelect value="MANAGER" onChange={vi.fn()} />);
    expect(screen.getByText(/manager/i)).toBeInTheDocument();
  });
});
