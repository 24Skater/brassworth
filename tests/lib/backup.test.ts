import { describe, it, expect, beforeEach } from 'vitest';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  backupFileName,
  createBackup,
  parseBackup,
  restoreBackup,
  summarise,
} from '@/lib/backup';
import { storage, setStorageProvider } from '@/lib/storage';
import { LocalStorageProvider } from '@/lib/storage/providers/localStorageProvider';
import type { Item, Organization } from '@/types';

const org = (id: string): Organization => ({
  id,
  name: `Org ${id}`,
  type: 'home',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

const item = (id: string, organizationId = 'org1'): Item => ({
  id,
  organizationId,
  name: `Item ${id}`,
  condition: 'GOOD',
  quantity: 1,
  isArchived: false,
  tags: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

describe('backup', () => {
  beforeEach(() => {
    setStorageProvider(new LocalStorageProvider());
  });

  describe('createBackup', () => {
    it('writes a versioned envelope', async () => {
      const parsed = JSON.parse(await createBackup());

      expect(parsed.format).toBe(BACKUP_FORMAT);
      expect(parsed.version).toBe(BACKUP_VERSION);
      expect(parsed.exportedAt).toBeTruthy();
    });

    it('captures every collection', async () => {
      await storage.setOrganizations([org('org1')]);
      await storage.setItems([item('i1'), item('i2')]);

      const parsed = JSON.parse(await createBackup());

      expect(parsed.data.organizations).toHaveLength(1);
      expect(parsed.data.items).toHaveLength(2);
      expect(parsed.data).toHaveProperty('photos');
      expect(parsed.data).toHaveProperty('documents');
      expect(parsed.data).toHaveProperty('userRoles');
    });

    it('round-trips through restore without losing ids', async () => {
      await storage.setOrganizations([org('org1')]);
      await storage.setItems([item('i1')]);

      const json = await createBackup();
      await storage.clearAll();
      expect(await storage.getItems()).toHaveLength(0);

      await restoreBackup(json);

      const items = await storage.getItems();
      expect(items).toHaveLength(1);
      expect(items[0]?.id).toBe('i1');
      expect(items[0]?.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('parseBackup', () => {
    it('rejects text that is not JSON', () => {
      expect(() => parseBackup('not json at all')).toThrow(/not valid JSON/i);
    });

    it('rejects JSON that is not a backup', () => {
      expect(() => parseBackup(JSON.stringify({ hello: 'world' }))).toThrow(
        /not a Brassworth backup/i
      );
    });

    it('rejects a backup with a damaged body', () => {
      const bad = JSON.stringify({
        format: BACKUP_FORMAT,
        version: 1,
        exportedAt: new Date().toISOString(),
        data: { organizations: [{ noIdHere: true }] },
      });

      expect(() => parseBackup(bad)).toThrow(/damaged or incomplete/i);
    });

    it('refuses a backup from a newer format version', () => {
      const future = JSON.stringify({
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION + 1,
        exportedAt: new Date().toISOString(),
        data: { organizations: [] },
      });

      expect(() => parseBackup(future)).toThrow(/newer version/i);
    });

    it('accepts a backup missing optional collections', () => {
      const minimal = JSON.stringify({
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: { organizations: [org('org1')] },
      });

      const parsed = parseBackup(minimal);
      expect(parsed.data.items).toEqual([]);
      expect(parsed.data.organizations).toHaveLength(1);
    });
  });

  describe('restoreBackup', () => {
    it('replaces existing data rather than merging into it', async () => {
      await storage.setItems([item('old-1'), item('old-2')]);

      const json = JSON.stringify({
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: { organizations: [org('org1')], items: [item('new-1')] },
      });

      await restoreBackup(json);

      const items = await storage.getItems();
      expect(items).toHaveLength(1);
      expect(items[0]?.id).toBe('new-1');
    });

    it('writes nothing when the file is invalid', async () => {
      await storage.setItems([item('keep-me')]);

      await expect(restoreBackup('garbage')).rejects.toThrow();

      const items = await storage.getItems();
      expect(items).toHaveLength(1);
      expect(items[0]?.id).toBe('keep-me');
    });

    it('reports what it restored', async () => {
      const json = JSON.stringify({
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: { organizations: [org('org1')], items: [item('i1'), item('i2')] },
      });

      const summary = await restoreBackup(json);

      expect(summary.items).toBe(2);
      expect(summary.organizations).toBe(1);
    });
  });

  describe('summarise', () => {
    it('counts each collection', () => {
      const backup = parseBackup(
        JSON.stringify({
          format: BACKUP_FORMAT,
          version: BACKUP_VERSION,
          exportedAt: new Date().toISOString(),
          data: { items: [item('a'), item('b'), item('c')] },
        })
      );

      expect(summarise(backup).items).toBe(3);
      expect(summarise(backup).organizations).toBe(0);
    });
  });

  describe('backupFileName', () => {
    it('is dated and json', () => {
      expect(backupFileName(new Date('2026-09-05T12:00:00Z'))).toBe(
        'brassworth-backup-2026-09-05.json'
      );
    });
  });
});
