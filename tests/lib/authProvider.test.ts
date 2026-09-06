import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocalStorageAuthProvider,
  LocalStorageRoleProvider,
} from '@/lib/auth/providers/localStorage';
import { parseReceiptText } from '@/lib/receipt/utils/textParser';

const PASSWORD = 'correct horse battery staple';

describe('LocalStorageAuthProvider', () => {
  let auth: LocalStorageAuthProvider;

  beforeEach(() => {
    localStorage.clear();
    auth = new LocalStorageAuthProvider();
  });

  describe('signup', () => {
    it('creates an account and signs it in', async () => {
      const { user, error } = await auth.signup('new@example.com', PASSWORD, 'New User');

      expect(error).toBeUndefined();
      expect(user?.email).toBe('new@example.com');
      expect(auth.getCurrentUser()?.email).toBe('new@example.com');
    });

    it('refuses a duplicate address', async () => {
      await auth.signup('dupe@example.com', PASSWORD, 'First');
      const second = await auth.signup('dupe@example.com', PASSWORD, 'Second');

      expect(second.user).toBeNull();
      expect(second.error).toBeTruthy();
    });

    it('refuses a password below the minimum length', async () => {
      const { user, error } = await auth.signup('weak@example.com', 'short', 'Weak');

      expect(user).toBeNull();
      expect(error).toMatch(/12 characters/i);
    });

    it('never stores the password in the clear', async () => {
      await auth.signup('secret@example.com', PASSWORD, 'Secret');

      const stored = localStorage.getItem('brassworth_all_users') ?? '';
      expect(stored).not.toContain(PASSWORD);
      expect(stored).toContain('passwordHash');
      expect(stored).toContain('passwordSalt');
    });

    it('salts, so two accounts with the same password hash differently', async () => {
      await auth.signup('a@example.com', PASSWORD, 'A');
      await auth.signup('b@example.com', PASSWORD, 'B');

      const users = JSON.parse(localStorage.getItem('brassworth_all_users') ?? '[]');
      expect(users[0].passwordHash).not.toBe(users[1].passwordHash);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await auth.signup('user@example.com', PASSWORD, 'User');
      await auth.logout();
    });

    it('accepts the right password', async () => {
      const { user, error } = await auth.login('user@example.com', PASSWORD);

      expect(error).toBeUndefined();
      expect(user?.email).toBe('user@example.com');
    });

    it('rejects the wrong password', async () => {
      const { user, error } = await auth.login('user@example.com', 'wrong but long enough');

      expect(user).toBeNull();
      expect(error).toBeTruthy();
    });

    it('rejects an unknown account with the same message', async () => {
      const unknown = await auth.login('nobody@example.com', PASSWORD);
      const wrong = await auth.login('user@example.com', 'wrong but long enough');

      // Neither answer tells a caller whether the account exists.
      expect(unknown.error).toBe(wrong.error);
    });

    it('locks the account after repeated failures', async () => {
      for (let i = 0; i < 6; i += 1) {
        await auth.login('user@example.com', 'wrong but long enough');
      }

      const result = await auth.login('user@example.com', PASSWORD);
      expect(result.user).toBeNull();
      expect(result.error).toMatch(/locked/i);
    });

    it('keeps a longer session when asked to remember', async () => {
      await auth.login('user@example.com', PASSWORD, true);
      const remembered = auth.getSession();

      await auth.logout();
      await auth.login('user@example.com', PASSWORD, false);
      const short = auth.getSession();

      expect(Date.parse(remembered!.expiresAt)).toBeGreaterThan(Date.parse(short!.expiresAt));
      expect(remembered?.rememberMe).toBe(true);
    });
  });

  describe('sessions', () => {
    it('is invalid before anybody signs in', async () => {
      expect(await auth.validateSession()).toBe(false);
      expect(auth.getSession()).toBeNull();
    });

    it('is valid straight after signing up', async () => {
      await auth.signup('user@example.com', PASSWORD, 'User');
      expect(await auth.validateSession()).toBe(true);
    });

    it('is invalid once expired', async () => {
      await auth.signup('user@example.com', PASSWORD, 'User');

      const session = JSON.parse(localStorage.getItem('brassworth_session') ?? '{}');
      session.expiresAt = new Date(Date.now() - 1000).toISOString();
      localStorage.setItem('brassworth_session', JSON.stringify(session));

      expect(await auth.validateSession()).toBe(false);
    });

    it('extends a session on refresh', async () => {
      await auth.signup('user@example.com', PASSWORD, 'User');
      const before = auth.getSession()?.expiresAt;

      expect(await auth.refreshSession()).toBe(true);
      expect(Date.parse(auth.getSession()!.expiresAt)).toBeGreaterThanOrEqual(
        Date.parse(before ?? '')
      );
    });

    it('cannot refresh when nobody is signed in', async () => {
      expect(await auth.refreshSession()).toBe(false);
    });

    it('clears everything on logout', async () => {
      await auth.signup('user@example.com', PASSWORD, 'User');
      await auth.logout();

      expect(auth.getCurrentUser()).toBeNull();
      expect(auth.getSession()).toBeNull();
      expect(await auth.validateSession()).toBe(false);
    });
  });

  describe('people', () => {
    it('lists accounts without their credentials', async () => {
      await auth.signup('one@example.com', PASSWORD, 'One');
      await auth.signup('two@example.com', PASSWORD, 'Two');

      const users = auth.listUsers();
      expect(users).toHaveLength(2);
      expect(users[0]).not.toHaveProperty('passwordHash');
    });

    it('invites somebody into an organisation', async () => {
      const { user, error } = await auth.inviteUser(
        'invited@example.com',
        'Invited',
        'org-1',
        'MANAGER'
      );

      expect(error).toBeUndefined();
      expect(user?.email).toBe('invited@example.com');
    });

    it('refuses to invite an address that already exists', async () => {
      await auth.signup('taken@example.com', PASSWORD, 'Taken');
      const result = await auth.inviteUser('taken@example.com', 'Again', 'org-1', 'VIEWER');

      expect(result.user).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('removes somebody from an organisation', async () => {
      const { user } = await auth.inviteUser('bye@example.com', 'Bye', 'org-1', 'VIEWER');
      const result = await auth.removeUser(user!.id, 'org-1');

      expect(result.success).toBe(true);
    });
  });
});

describe('LocalStorageRoleProvider', () => {
  let roles: LocalStorageRoleProvider;

  beforeEach(() => {
    localStorage.clear();
    roles = new LocalStorageRoleProvider();
  });

  it('has no role until one is set', () => {
    expect(roles.getUserRole('u1', 'o1')).toBeNull();
  });

  it('stores and reads a role', () => {
    roles.setUserRole('u1', 'o1', 'ADMIN');
    expect(roles.getUserRole('u1', 'o1')).toBe('ADMIN');
  });

  it('keeps roles separate per organisation', () => {
    roles.setUserRole('u1', 'o1', 'ADMIN');
    roles.setUserRole('u1', 'o2', 'VIEWER');

    expect(roles.getUserRole('u1', 'o1')).toBe('ADMIN');
    expect(roles.getUserRole('u1', 'o2')).toBe('VIEWER');
  });

  it('updates in place rather than duplicating', () => {
    roles.setUserRole('u1', 'o1', 'VIEWER');
    roles.setUserRole('u1', 'o1', 'MANAGER');

    expect(roles.getUserRole('u1', 'o1')).toBe('MANAGER');
    expect(roles.getUserRolesInOrg('o1')).toHaveLength(1);
  });

  it('lists everybody in one organisation', () => {
    roles.setUserRole('u1', 'o1', 'ADMIN');
    roles.setUserRole('u2', 'o1', 'VIEWER');
    roles.setUserRole('u3', 'o2', 'VIEWER');

    expect(roles.getUserRolesInOrg('o1')).toHaveLength(2);
  });

  it('removes a role', () => {
    roles.setUserRole('u1', 'o1', 'ADMIN');
    roles.removeUserRole('u1', 'o1');

    expect(roles.getUserRole('u1', 'o1')).toBeNull();
  });
});

describe('parseReceiptText', () => {
  it('finds nothing in an empty receipt', () => {
    expect(parseReceiptText('').items).toHaveLength(0);
  });

  it('reads a line item and its price', () => {
    const receipt = parseReceiptText('HARDWARE STORE\nCordless Drill  199.99\n');

    expect(receipt.items).toHaveLength(1);
    expect(receipt.items[0]?.description).toContain('Cordless Drill');
    expect(receipt.items[0]?.lineTotal).toBe(199.99);
  });

  it('skips totals and tax lines', () => {
    const receipt = parseReceiptText('Drill  100.00\nSubtotal  100.00\nTax  8.00\nTotal  108.00\n');

    expect(receipt.items).toHaveLength(1);
    expect(receipt.items[0]?.description).toContain('Drill');
  });

  it('strips thousands separators from a price', () => {
    const receipt = parseReceiptText('Table Saw  1,299.00\n');
    expect(receipt.items[0]?.lineTotal).toBe(1299);
  });

  it('reads a quantity written before the x', () => {
    expect(parseReceiptText('2x Drill Bits  20.00\n').items[0]?.quantity).toBe(2);
  });

  it('reads a quantity written after the x', () => {
    expect(parseReceiptText('Drill Bits x3  30.00\n').items[0]?.quantity).toBe(3);
  });

  it('defaults to one when no quantity is given', () => {
    expect(parseReceiptText('Drill Bits  20.00\n').items[0]?.quantity).toBe(1);
  });

  it('divides the line total into a unit price', () => {
    const item = parseReceiptText('2x Drill Bits  20.00\n').items[0];

    expect(item?.unitPrice).toBe(10);
    expect(item?.lineTotal).toBe(20);
  });

  it('drops the quantity from the description it keeps', () => {
    expect(parseReceiptText('2x Drill Bits  20.00\n').items[0]?.description).toBe('Drill Bits');
  });

  it('ignores a zero or negative price', () => {
    expect(parseReceiptText('Freebie  0.00\n').items).toHaveLength(0);
  });
});
