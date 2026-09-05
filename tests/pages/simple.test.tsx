import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPage, seed, TEST_ORG } from '../helpers/renderPage';
import { storage } from '@/lib/storage';
import NotFound from '@/pages/NotFound';
import Index from '@/pages/Index';
import Categories from '@/pages/Categories';
import Locations from '@/pages/Locations';
import Organizations from '@/pages/Organizations';
import Users from '@/pages/Users';

describe('NotFound', () => {
  beforeEach(async () => {
    await seed();
  });

  it('tells the visitor the page does not exist', () => {
    renderPage(<NotFound />, { route: '/nowhere' });
    // The page says it more than once; one clear mention is enough.
    expect(screen.getAllByText(/404|not found/i).length).toBeGreaterThan(0);
  });
});

describe('Index', () => {
  beforeEach(async () => {
    await seed({ signedOut: true });
  });

  it('sells the product to a signed-out visitor', async () => {
    renderPage(<Index />);

    expect(await screen.findByText(/track what you own/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start tracking now/i })).toBeInTheDocument();
  });

  it('names the three things it does', async () => {
    renderPage(<Index />);

    expect(await screen.findByText(/catalogue everything/i)).toBeInTheDocument();
    expect(screen.getByText(/built for claims/i)).toBeInTheDocument();
    expect(screen.getByText(/find anything fast/i)).toBeInTheDocument();
  });
});

describe('Categories', () => {
  beforeEach(async () => {
    await seed();
  });

  it('asks for a property when none is selected', async () => {
    await seed({ withoutOrg: true });
    renderPage(<Categories />);

    expect(await screen.findByText(/no property selected/i)).toBeInTheDocument();
  });

  it('shows existing categories', async () => {
    await storage.setCategories([
      { id: 'c1', organizationId: TEST_ORG.id, name: 'Power Tools' },
      { id: 'c2', organizationId: TEST_ORG.id, name: 'Hand Tools' },
    ]);

    renderPage(<Categories />);

    expect(await screen.findByText('Power Tools')).toBeInTheDocument();
    expect(screen.getByText('Hand Tools')).toBeInTheDocument();
  });

  it('creates a category', async () => {
    const user = userEvent.setup();
    renderPage(<Categories />);

    await user.click(await screen.findByRole('button', { name: /add category/i }));

    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/name/i), 'Fasteners');
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(async () => {
      expect(await storage.getCategories()).toHaveLength(1);
    });
  });

  it('ignores categories belonging to another property', async () => {
    await storage.setCategories([{ id: 'c1', organizationId: 'somebody-else', name: 'Not Mine' }]);

    renderPage(<Categories />);

    await waitFor(() => {
      expect(screen.queryByText('Not Mine')).not.toBeInTheDocument();
    });
  });
});

describe('Locations', () => {
  beforeEach(async () => {
    await seed();
  });

  it('asks for a property when none is selected', async () => {
    await seed({ withoutOrg: true });
    renderPage(<Locations />);

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/no property|select|create a property/i);
    });
  });

  it('shows existing locations', async () => {
    await storage.setLocations([
      { id: 'l1', organizationId: TEST_ORG.id, name: 'Garage' },
      { id: 'l2', organizationId: TEST_ORG.id, name: 'Office' },
    ]);

    renderPage(<Locations />);

    expect(await screen.findByText('Garage')).toBeInTheDocument();
    expect(screen.getByText('Office')).toBeInTheDocument();
  });
});

describe('Organizations', () => {
  beforeEach(async () => {
    await seed();
  });

  it('lists the properties you belong to', async () => {
    renderPage(<Organizations />);

    // The name appears in the navigation and on its card.
    await waitFor(() => {
      expect(screen.getAllByText('Test Workshop').length).toBeGreaterThan(0);
    });
  });

  it('offers to create another', async () => {
    renderPage(<Organizations />);

    expect(await screen.findByRole('button', { name: /create property/i })).toBeInTheDocument();
  });
});

describe('Users', () => {
  beforeEach(async () => {
    await seed();
  });

  it('renders nothing rather than crashing when no property is selected', async () => {
    await seed({ withoutOrg: true });

    // The page guards on a selected property and renders nothing without one.
    // Asserting that explicitly beats asserting "something is on screen",
    // which would pass for the wrong reason.
    expect(() => renderPage(<Users />)).not.toThrow();
    await waitFor(() => {
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });
  });

  it('lists the people on the property', async () => {
    renderPage(<Users />);

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/tester|user|member/i);
    });
  });
});
