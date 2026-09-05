import { describe, it, expect, vi } from 'vitest';
import { availableProfiles, fetchVendorCatalogue, mergeProfileSources } from '@/lib/gear/resolve';
import { bundledCatalogue } from '@/lib/gear/catalogue';
import { indexProfilesByKey, profileKey } from '@/lib/gear';
import type { GearProfile } from '@/types';

function profile(over: Partial<GearProfile> = {}): GearProfile {
  return {
    id: 'p1',
    brand: 'DeWalt',
    model: 'DCD791D2',
    specs: [],
    source: 'CATALOGUE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function jsonResponse(body: unknown, ok = true): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), { status: ok ? 200 : 500 })) as unknown as typeof fetch;
}

describe('mergeProfileSources', () => {
  it('keeps profiles from every source', () => {
    const merged = mergeProfileSources([profile({ id: 'a' })], [profile({ id: 'b' })]);
    expect(merged).toHaveLength(2);
  });

  it('lets a later source replace the same id', () => {
    const merged = mergeProfileSources(
      [profile({ id: 'a', productType: 'old' })],
      [profile({ id: 'a', productType: 'new' })]
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.productType).toBe('new');
  });

  it('returns nothing for no sources', () => {
    expect(mergeProfileSources()).toEqual([]);
  });
});

describe('availableProfiles', () => {
  it('includes the shipped catalogue', () => {
    expect(availableProfiles([]).length).toBe(bundledCatalogue().length);
  });

  it('adds the organisation own profiles alongside it', () => {
    const mine = profile({ id: 'mine', brand: 'Acme', model: 'A1', source: 'USER' });
    const all = availableProfiles([mine]);
    expect(all.some((p) => p.id === 'mine')).toBe(true);
  });

  it('lets a user profile win the match for a model the catalogue also has', () => {
    const catalogueEntry = bundledCatalogue()[0] as GearProfile;
    const mine = profile({
      id: 'mine',
      brand: catalogueEntry.brand,
      model: catalogueEntry.model,
      source: 'USER',
    });

    const index = indexProfilesByKey(availableProfiles([mine]));
    expect(index.get(profileKey(catalogueEntry.brand, catalogueEntry.model))?.id).toBe('mine');
  });

  it('keeps both records, so the catalogue entry is still browsable', () => {
    const catalogueEntry = bundledCatalogue()[0] as GearProfile;
    const mine = profile({
      id: 'mine',
      brand: catalogueEntry.brand,
      model: catalogueEntry.model,
      source: 'USER',
    });

    const all = availableProfiles([mine]);
    expect(all.some((p) => p.id === catalogueEntry.id)).toBe(true);
  });
});

describe('fetchVendorCatalogue', () => {
  it('is empty when no source is configured', async () => {
    expect(await fetchVendorCatalogue(jsonResponse({ configured: false }))).toEqual([]);
  });

  it('parses a configured source', async () => {
    const profiles = await fetchVendorCatalogue(
      jsonResponse({
        configured: true,
        name: 'Vendor',
        document: {
          formatVersion: 1,
          licence: 'Vendor terms',
          profiles: [{ brand: 'Hilti', model: 'SF 6H-A22' }],
        },
      })
    );

    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({ brand: 'Hilti', sourceName: 'Vendor' });
  });

  it('is empty rather than throwing when the server is unreachable', async () => {
    const failing = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await fetchVendorCatalogue(failing)).toEqual([]);
  });

  it('is empty when the server answers with an error', async () => {
    expect(await fetchVendorCatalogue(jsonResponse({ error: 'nope' }, false))).toEqual([]);
  });

  it('is empty when the body is not JSON', async () => {
    const html = (async () => new Response('<html>')) as unknown as typeof fetch;
    expect(await fetchVendorCatalogue(html)).toEqual([]);
  });

  it('drops bad vendor entries rather than the whole document', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const profiles = await fetchVendorCatalogue(
      jsonResponse({
        configured: true,
        name: 'Vendor',
        document: {
          formatVersion: 1,
          profiles: [{ brand: 'Hilti', model: 'SF 6H-A22' }, { brand: 'No model' }],
        },
      })
    );

    expect(profiles).toHaveLength(1);
    warn.mockRestore();
  });

  it('gives a vendor document no more trust than the shipped one', async () => {
    const profiles = await fetchVendorCatalogue(
      jsonResponse({
        configured: true,
        name: 'Vendor',
        document: {
          formatVersion: 1,
          profiles: [
            {
              brand: 'Hilti',
              model: 'SF 6H-A22',
              source: 'USER',
              organizationId: 'org-sneaky',
              manualUrl: 'javascript:alert(1)',
            },
          ],
        },
      })
    );

    expect(profiles[0]).toMatchObject({ source: 'CATALOGUE' });
    expect(profiles[0]?.organizationId).toBeUndefined();
    expect(profiles[0]?.manualUrl).toBeUndefined();
  });
});
