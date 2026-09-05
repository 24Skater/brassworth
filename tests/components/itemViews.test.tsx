import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemListView } from '@/components/items/ItemListView';
import { ItemTableView } from '@/components/items/ItemTableView';
import { ItemGalleryView } from '@/components/items/ItemGalleryView';
import { LazyImage } from '@/components/common/LazyImage';
import {
  DashboardSkeleton,
  ItemsGridSkeleton,
  ItemListSkeleton,
  ItemTableSkeleton,
} from '@/components/common/Skeletons';
import { UserCard } from '@/components/users/UserCard';
import { renderPage, seed } from '../helpers/renderPage';
import type { Item, User, UserRole } from '@/types';

// These components gate on permissions the signed-in person holds; grant them
// all, so each test asserts on what the component renders rather than on the
// role plumbing, which RolesContext's own tests cover. The provider stays a
// passthrough so the shared harness can still wrap pages in it.
vi.mock('@/contexts/RolesContext', () => ({
  usePermission: vi.fn(() => true),
  useRoles: vi.fn(() => ({ currentRole: 'ADMIN', hasPermission: () => true })),
  RolesProvider: ({ children }: { children: ReactNode }) => children,
}));

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    organizationId: 'org-1',
    name: 'Cordless Drill',
    brand: 'Milwaukee',
    model: 'M18',
    condition: 'GOOD',
    quantity: 1,
    isArchived: false,
    tags: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ItemListView', () => {
  function renderList(item = makeItem()) {
    const handlers = { onView: vi.fn(), onArchive: vi.fn(), onDelete: vi.fn() };
    render(
      <ItemListView item={item} categoryName="Power Tools" locationName="Garage" {...handlers} />
    );
    return handlers;
  }

  it('shows the item, its category and where it lives', () => {
    renderList();

    expect(screen.getByText('Cordless Drill')).toBeInTheDocument();
    expect(screen.getByText(/power tools/i)).toBeInTheDocument();
    expect(screen.getByText(/garage/i)).toBeInTheDocument();
  });

  it('opens the item when clicked', async () => {
    const user = userEvent.setup();
    const { onView } = renderList();

    await user.click(screen.getByText('Cordless Drill'));

    expect(onView).toHaveBeenCalled();
  });

  it('shows the brand and model together', () => {
    renderList();
    expect(screen.getByText(/milwaukee/i)).toBeInTheDocument();
  });

  it('renders an item with nothing optional filled in', () => {
    const bare = makeItem({ brand: undefined, model: undefined, purchasePrice: undefined });

    expect(() =>
      render(
        <ItemListView
          item={bare}
          categoryName="Uncategorised"
          locationName="Unknown"
          onView={vi.fn()}
          onArchive={vi.fn()}
          onDelete={vi.fn()}
        />
      )
    ).not.toThrow();
  });
});

describe('ItemTableView', () => {
  const items = [
    makeItem(),
    makeItem({ id: 'item-2', name: 'Table Saw', brand: 'DeWalt', purchasePrice: 599 }),
  ];

  function renderTable(rows = items) {
    const handlers = { onView: vi.fn(), onArchive: vi.fn(), onDelete: vi.fn() };
    render(
      <ItemTableView
        items={rows}
        getCategoryName={() => 'Power Tools'}
        getLocationName={() => 'Garage'}
        {...handlers}
      />
    );
    return handlers;
  }

  it('renders one row per item', () => {
    renderTable();

    expect(screen.getByText('Cordless Drill')).toBeInTheDocument();
    expect(screen.getByText('Table Saw')).toBeInTheDocument();
  });

  it('renders a header row', () => {
    renderTable();

    const headers = screen.getAllByRole('columnheader');
    expect(headers.length).toBeGreaterThan(0);
  });

  it('opens the item that was clicked, not another one', async () => {
    const user = userEvent.setup();
    const { onView } = renderTable();

    await user.click(screen.getByText('Table Saw'));

    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ name: 'Table Saw' }));
  });

  it('renders an empty table without falling over', () => {
    expect(() => renderTable([])).not.toThrow();
  });
});

describe('ItemGalleryView', () => {
  function renderGallery(item = makeItem()) {
    const handlers = { onView: vi.fn(), onArchive: vi.fn(), onDelete: vi.fn() };
    render(<ItemGalleryView item={item} categoryName="Power Tools" {...handlers} />);
    return handlers;
  }

  it('shows the item name', () => {
    renderGallery();
    expect(screen.getByText('Cordless Drill')).toBeInTheDocument();
  });

  it('opens the item when clicked', async () => {
    const user = userEvent.setup();
    const { onView } = renderGallery();

    await user.click(screen.getByText('Cordless Drill'));

    expect(onView).toHaveBeenCalled();
  });

  it('renders an item that has no photo', () => {
    expect(() => renderGallery(makeItem({ id: 'no-photo' }))).not.toThrow();
  });
});

describe('LazyImage', () => {
  it('renders the alt text so the image is described', () => {
    render(<LazyImage src="/drill.jpg" alt="A cordless drill" />);

    expect(screen.getByAltText('A cordless drill')).toBeInTheDocument();
  });

  it('loads the real source once the image scrolls into view', () => {
    render(<LazyImage src="/drill.jpg" alt="A cordless drill" />);

    // The stub observer reports the element as visible immediately.
    expect(screen.getByAltText('A cordless drill')).toHaveAttribute('src', '/drill.jpg');
  });

  it('shows the placeholder before the real source arrives', () => {
    render(<LazyImage src="/drill.jpg" alt="A drill" placeholder="/blur.jpg" />);

    expect(screen.getByAltText('A drill')).toHaveAttribute('src', expect.stringContaining('.jpg'));
  });

  it('reports an image that fails to load', () => {
    const onError = vi.fn();
    render(<LazyImage src="/missing.jpg" alt="Missing" onError={onError} />);

    screen.getByAltText('Missing').dispatchEvent(new Event('error'));

    expect(onError).toHaveBeenCalled();
  });
});

describe('loading skeletons', () => {
  it('renders the dashboard skeleton', () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders as many cards as asked for', () => {
    const { container } = render(<ItemsGridSkeleton count={3} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders the list skeleton', () => {
    const { container } = render(<ItemListSkeleton count={2} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the table skeleton', () => {
    const { container } = render(<ItemTableSkeleton count={2} />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe('UserCard', () => {
  // UserCard asks who is signed in, so it needs the real provider stack.
  beforeEach(async () => {
    await seed();
  });

  const user: User = {
    id: 'u1',
    email: 'tester@example.com',
    name: 'Tester',
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  const role: UserRole = 'ADMIN';

  it('shows the person and their role', () => {
    renderPage(<UserCard user={user} userRole={role} />);

    expect(screen.getByText('Tester')).toBeInTheDocument();
    expect(screen.getByText('tester@example.com')).toBeInTheDocument();
    // An admin may change roles, so the role shows as a control rather than text.
    expect(screen.getByText(/administrator|admin/i)).toBeInTheDocument();
  });

  it('renders somebody with no role assigned', () => {
    renderPage(<UserCard user={user} userRole={null} />);

    expect(screen.getByText('Tester')).toBeInTheDocument();
  });

  it('falls back to the address when there is no name', () => {
    renderPage(<UserCard user={{ ...user, name: '' }} userRole={role} />);

    const card = screen.getByText('tester@example.com');
    expect(within(card.closest('div') as HTMLElement).getByText(/tester@/)).toBeInTheDocument();
  });
});
