import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import Labels from '@/pages/Labels';
import { storage } from '@/lib/storage';
import { renderPage, seed, TEST_ORG } from '../helpers/renderPage';

async function seedItem(name: string) {
  return storage.createItem({
    organizationId: TEST_ORG.id,
    name,
    condition: 'GOOD',
    quantity: 1,
    isArchived: false,
    tags: [],
  });
}

describe('Labels', () => {
  beforeEach(async () => {
    await seed();
  });

  it('lists the items that can be labelled', async () => {
    await seedItem('Cordless Drill');
    await seedItem('Rack Switch');

    renderPage(<Labels />, { route: '/labels' });

    expect(await screen.findByLabelText('Cordless Drill')).toBeInTheDocument();
    expect(screen.getByLabelText('Rack Switch')).toBeInTheDocument();
  });

  it('renders a QR label once an item is chosen', async () => {
    await seedItem('Cordless Drill');

    renderPage(<Labels />, { route: '/labels' });

    await userEvent.click(await screen.findByLabelText('Cordless Drill'));

    const sheet = await screen.findByTestId('label-sheet');
    expect(sheet.querySelector('svg')).not.toBeNull();
    expect(sheet).toHaveTextContent('Cordless Drill');
  });

  it('says what to do when there are no items yet', async () => {
    renderPage(<Labels />, { route: '/labels' });

    expect(await screen.findByText(/nothing to label yet/i)).toBeInTheDocument();
  });
});
