import { describe, it, expect, beforeEach } from 'vitest';
import { createHarness, itemInput, signUpAndSelectOrg, type Harness, PASSWORD } from './harness';
import { ApiError } from '@/lib/storage/providers/apiProvider';
import { ApiRoleProvider } from '@/lib/auth/providers/api';

/** Covers the read/update/delete surface the headline tests do not reach. */

let h: Harness;

beforeEach(async () => {
  h = createHarness();
  await h.ready;
});

describe('single-record reads', () => {
  it('reads a record back by id, and null for one that is not there', async () => {
    await signUpAndSelectOrg(h);

    const location = await h.storage.createLocation({ name: 'Garage' } as never);
    const category = await h.storage.createCategory({ name: 'Power Tools' } as never);
    const tag = await h.storage.createTag({ name: 'cordless' } as never);
    const item = await h.storage.createItem(itemInput('Drill') as never);

    expect((await h.storage.getLocation(location.id))?.name).toBe('Garage');
    expect((await h.storage.getCategory(category.id))?.name).toBe('Power Tools');
    expect((await h.storage.getTag(tag.id))?.name).toBe('cordless');
    expect((await h.storage.getItem(item.id))?.name).toBe('Drill');

    expect(await h.storage.getLocation('missing')).toBeNull();
    expect(await h.storage.getCategory('missing')).toBeNull();
    expect(await h.storage.getTag('missing')).toBeNull();
    expect(await h.storage.getItem('missing')).toBeNull();
  });

  it('filters on the by-organisation readers', async () => {
    const orgId = await signUpAndSelectOrg(h);
    await h.storage.createLocation({ name: 'Garage' } as never);
    await h.storage.createItem(itemInput('Drill') as never);

    expect(await h.storage.getLocationsByOrg(orgId)).toHaveLength(1);
    expect(await h.storage.getLocationsByOrg('someone-else')).toHaveLength(0);
    expect(await h.storage.getItemsByOrg(orgId)).toHaveLength(1);
    expect(await h.storage.getCategoriesByOrg(orgId)).toHaveLength(0);
    expect(await h.storage.getTagsByOrg(orgId)).toHaveLength(0);
  });
});

describe('updates and deletes', () => {
  it('changes and removes locations, categories and tags', async () => {
    await signUpAndSelectOrg(h);

    const location = await h.storage.createLocation({ name: 'Garage' } as never);
    const category = await h.storage.createCategory({ name: 'Tools' } as never);
    const tag = await h.storage.createTag({ name: 'old' } as never);

    expect((await h.storage.updateLocation(location.id, { name: 'Shed' })).name).toBe('Shed');
    expect((await h.storage.updateCategory(category.id, { name: 'Gear' })).name).toBe('Gear');
    expect((await h.storage.updateTag(tag.id, { name: 'new' })).name).toBe('new');

    await h.storage.deleteLocation(location.id);
    await h.storage.deleteCategory(category.id);
    await h.storage.deleteTag(tag.id);

    expect(await h.storage.getLocations()).toHaveLength(0);
    expect(await h.storage.getCategories()).toHaveLength(0);
    expect(await h.storage.getTags()).toHaveLength(0);
  });
});

describe('photos and documents', () => {
  it('round-trips both against their item', async () => {
    const orgId = await signUpAndSelectOrg(h);
    const item = await h.storage.createItem(itemInput('Drill') as never);

    const photo = await h.storage.createPhoto({
      itemId: item.id,
      fileUrl: 'data:image/png;base64,AAA',
      takenAt: '2024-01-01T00:00:00.000Z',
    } as never);

    const document = await h.storage.createDocument({
      itemId: item.id,
      type: 'RECEIPT',
      fileName: 'receipt.pdf',
      fileUrl: 'data:application/pdf;base64,AAA',
      uploadedAt: '2024-01-01T00:00:00.000Z',
    } as never);

    expect(await h.storage.getPhotosByItem(item.id)).toHaveLength(1);
    expect((await h.storage.getPhoto(photo.id))?.itemId).toBe(item.id);
    expect(await h.storage.getPhoto('missing')).toBeNull();

    expect(await h.storage.getDocumentsByItem(item.id)).toHaveLength(1);
    expect(await h.storage.getDocumentsByOrg(orgId)).toHaveLength(1);
    expect((await h.storage.getDocument(document.id))?.fileName).toBe('receipt.pdf');
    expect(await h.storage.getDocument('missing')).toBeNull();

    await h.storage.updatePhoto(photo.id, { caption: 'Side view' });
    await h.storage.updateDocument(document.id, { fileName: 'invoice.pdf' });
    expect((await h.storage.getPhoto(photo.id))?.caption).toBe('Side view');
    expect((await h.storage.getDocument(document.id))?.fileName).toBe('invoice.pdf');

    await h.storage.deletePhoto(photo.id);
    await h.storage.deleteDocument(document.id);
    expect(await h.storage.getPhotos()).toHaveLength(0);
    expect(await h.storage.getDocuments()).toHaveLength(0);
  });
});

describe('item events', () => {
  it('removes every event belonging to one item', async () => {
    await signUpAndSelectOrg(h);
    const item = await h.storage.createItem(itemInput('Drill') as never);

    await h.storage.createItemEvent({
      itemId: item.id,
      organizationId: 'set-by-the-server',
      type: 'LOANED_OUT',
      occurredAt: '2024-01-01T00:00:00.000Z',
    });
    await h.storage.createItemEvent({
      itemId: item.id,
      organizationId: 'set-by-the-server',
      type: 'RETURNED',
      occurredAt: '2024-02-01T00:00:00.000Z',
    });

    await h.storage.deleteItemEventsByItem(item.id);
    expect(await h.storage.getItemEvents()).toHaveLength(0);
  });
});

describe('role assignments', () => {
  it('sets, updates in place, and clears', async () => {
    const orgId = await signUpAndSelectOrg(h);
    const me = h.auth.getCurrentUser();
    expect(me).not.toBeNull();

    await h.storage.setUserRole({
      id: 'role-1',
      userId: me!.id,
      organizationId: orgId,
      role: 'MANAGER',
    });
    expect((await h.storage.getUserRole(me!.id, orgId))?.role).toBe('MANAGER');

    // Setting again must update rather than duplicate.
    await h.storage.setUserRole({
      id: 'role-1',
      userId: me!.id,
      organizationId: orgId,
      role: 'VIEWER',
    });
    expect(await h.storage.getUserRoles()).toHaveLength(1);
    expect((await h.storage.getUserRole(me!.id, orgId))?.role).toBe('VIEWER');

    await h.storage.deleteUserRole(me!.id, orgId);
    expect(await h.storage.getUserRole(me!.id, orgId)).toBeNull();
    // Deleting one that is already gone is not an error.
    await h.storage.deleteUserRole(me!.id, orgId);
  });
});

describe('organisations and memberships', () => {
  it('reads, updates and deletes a single organisation', async () => {
    const orgId = await signUpAndSelectOrg(h);

    expect((await h.storage.getOrganization(orgId))?.name).toBe('Workshop');
    expect(await h.storage.getOrganization('missing')).toBeNull();

    expect((await h.storage.updateOrganization(orgId, { name: 'Main Workshop' })).name).toBe(
      'Main Workshop'
    );

    await h.storage.deleteOrganization(orgId);
    expect(await h.storage.getOrganizations()).toHaveLength(0);
  });

  it('lists memberships for organisations the caller belongs to', async () => {
    const orgId = await signUpAndSelectOrg(h);

    expect(await h.storage.getMemberships()).toHaveLength(1);
    expect(await h.storage.getMembershipsByOrg(orgId)).toHaveLength(1);
    expect(await h.storage.getMembershipsByOrg('someone-else')).toHaveLength(0);
  });
});

describe('users', () => {
  it('lists people without ever exposing a password hash', async () => {
    await signUpAndSelectOrg(h, 'visible@example.com');

    const users = await h.storage.getUsers();
    expect(users).toHaveLength(1);
    expect(users[0]).not.toHaveProperty('passwordHash');

    expect((await h.storage.getUserByEmail('visible@example.com'))?.name).toBe('Test User');
    expect(await h.storage.getUserByEmail('nobody@example.com')).toBeNull();
    expect(await h.storage.getUserById('missing')).toBeNull();
  });

  it('refuses to create or modify accounts through the storage seam', async () => {
    await signUpAndSelectOrg(h);

    await expect(h.storage.createUser()).rejects.toBeInstanceOf(ApiError);
    await expect(h.storage.updateUser()).rejects.toBeInstanceOf(ApiError);
    await expect(h.storage.deleteUser()).rejects.toBeInstanceOf(ApiError);
  });
});

describe('scoping', () => {
  it('reports and clears the organisation it is acting for', async () => {
    const orgId = await signUpAndSelectOrg(h);
    expect(h.storage.getOrganizationId()).toBe(orgId);

    h.storage.setOrganization(null);
    expect(h.storage.getOrganizationId()).toBeNull();
    await expect(h.storage.getLocations()).rejects.toBeInstanceOf(ApiError);
  });
});

describe('ApiRoleProvider', () => {
  it('answers from what the server sent, and forgets on removal', () => {
    const roles = new ApiRoleProvider();

    roles.hydrate([
      { userId: 'u1', organizationId: 'o1', role: 'ADMIN' },
      { userId: 'u2', organizationId: 'o1', role: 'VIEWER' },
      { userId: 'u1', organizationId: 'o2', role: 'MANAGER' },
    ]);

    expect(roles.getUserRole('u1', 'o1')).toBe('ADMIN');
    expect(roles.getUserRole('u1', 'o2')).toBe('MANAGER');
    expect(roles.getUserRole('nobody', 'o1')).toBeNull();
    expect(roles.getUserRolesInOrg('o1')).toHaveLength(2);

    roles.setUserRole('u3', 'o1', 'CONTRIBUTOR');
    expect(roles.getUserRolesInOrg('o1')).toHaveLength(3);

    roles.removeUserRole('u3', 'o1');
    expect(roles.getUserRole('u3', 'o1')).toBeNull();
  });
});

describe('ApiAuthProvider — the remaining surface', () => {
  it('says plainly that inviting and removing people are not built yet', async () => {
    await h.auth.signup('admin@example.com', PASSWORD, 'Admin');

    expect((await h.auth.inviteUser()).error).toMatch(/not available yet/i);
    expect((await h.auth.removeUser()).success).toBe(false);
  });

  it('lists the people it can see once a session is validated', async () => {
    await signUpAndSelectOrg(h, 'seen@example.com');
    await h.auth.validateSession();

    // refreshUsers is fired off during validateSession; give it a turn.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(h.auth.listUsers().length).toBeGreaterThanOrEqual(1);
  });

  it('has no session shape at all when signed out', () => {
    expect(h.auth.getSession()).toBeNull();
  });

  it('refreshing a session is just re-checking it', async () => {
    await h.auth.signup('refresh@example.com', PASSWORD, 'R');
    expect(await h.auth.refreshSession()).toBe(true);

    await h.auth.logout();
    expect(await h.auth.refreshSession()).toBe(false);
  });
});
