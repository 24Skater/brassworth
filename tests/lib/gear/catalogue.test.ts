import { describe, it, expect } from 'vitest';
import {
  CATALOGUE_LICENCE,
  bundledCatalogue,
  catalogueProfileId,
  isCatalogueProfile,
  parseCatalogue,
} from '@/lib/gear/catalogue';
import { profileKey, indexProfilesByKey } from '@/lib/gear';

function file(profiles: unknown[], over: Record<string, unknown> = {}) {
  return {
    formatVersion: 1,
    name: 'Test catalogue',
    licence: 'ODbL-1.0',
    updatedAt: '2026-01-01T00:00:00.000Z',
    profiles,
    ...over,
  };
}

const VALID = {
  brand: 'DeWalt',
  model: 'DCD791D2',
  productType: 'Cordless drill',
  specs: [{ label: 'Voltage', value: '20', unit: 'V' }],
  manualUrl: 'https://example.com/manual.pdf',
};

describe('catalogueProfileId', () => {
  it('derives a stable id from brand and model', () => {
    expect(catalogueProfileId('DeWalt', 'DCD791D2')).toBe(
      `catalogue:${profileKey('DeWalt', 'DCD791D2')}`
    );
  });

  it('gives the same id whatever the spelling, so a link survives a re-spelling', () => {
    expect(catalogueProfileId('DE WALT', 'dcd-791 d2')).toBe(
      catalogueProfileId('DeWalt', 'DCD791D2')
    );
  });
});

describe('isCatalogueProfile', () => {
  it('recognises a catalogue id', () => {
    expect(isCatalogueProfile(catalogueProfileId('DeWalt', 'DCD791D2'))).toBe(true);
  });

  it('does not claim a stored user profile id', () => {
    expect(isCatalogueProfile('9f8c1e2a-0000-4000-8000-000000000000')).toBe(false);
  });

  it('is false for an empty id', () => {
    expect(isCatalogueProfile('')).toBe(false);
  });
});

describe('parseCatalogue — accepting good data', () => {
  it('reads a valid entry into a profile', () => {
    const { profiles, errors } = parseCatalogue(file([VALID]), 'Test catalogue');
    expect(errors).toEqual([]);
    expect(profiles[0]).toMatchObject({
      brand: 'DeWalt',
      model: 'DCD791D2',
      productType: 'Cordless drill',
      source: 'CATALOGUE',
      licence: 'ODbL-1.0',
      sourceName: 'Test catalogue',
    });
  });

  it('gives every entry a stable derived id rather than a fresh one per load', () => {
    const first = parseCatalogue(file([VALID]), 'Test catalogue').profiles[0];
    const second = parseCatalogue(file([VALID]), 'Test catalogue').profiles[0];
    expect(first?.id).toBe(second?.id);
  });

  it('dates the profiles from the file, not from the clock', () => {
    const profile = parseCatalogue(file([VALID]), 'Test catalogue').profiles[0];
    expect(profile?.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('accepts an entry with no specs at all', () => {
    const { profiles, errors } = parseCatalogue(
      file([{ brand: 'Ryobi', model: 'P252' }]),
      'Test catalogue'
    );
    expect(errors).toEqual([]);
    expect(profiles[0]?.specs).toEqual([]);
  });

  it('never carries an organizationId — catalogue records are not tenant data', () => {
    const profile = parseCatalogue(
      file([{ ...VALID, organizationId: 'org-sneaky' }]),
      'Test catalogue'
    ).profiles[0];
    expect(profile?.organizationId).toBeUndefined();
  });

  it('never lets a file claim its entries are USER records', () => {
    const profile = parseCatalogue(file([{ ...VALID, source: 'USER' }]), 'Test catalogue')
      .profiles[0];
    expect(profile?.source).toBe('CATALOGUE');
  });
});

describe('parseCatalogue — rejecting bad data', () => {
  it('rejects an entry with no brand and says which one', () => {
    const { profiles, errors } = parseCatalogue(file([{ model: 'X' }]), 'Test catalogue');
    expect(profiles).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/brand/i);
  });

  it('rejects an entry with no model', () => {
    expect(parseCatalogue(file([{ brand: 'DeWalt' }]), 'Test catalogue').profiles).toEqual([]);
  });

  it('keeps the good entries when one is bad', () => {
    const { profiles, errors } = parseCatalogue(file([VALID, { brand: 'X' }]), 'Test catalogue');
    expect(profiles).toHaveLength(1);
    expect(errors).toHaveLength(1);
  });

  it('drops a spec missing a label or value rather than the whole entry', () => {
    const { profiles } = parseCatalogue(
      file([{ ...VALID, specs: [{ label: 'Voltage', value: '20' }, { label: '' }] }]),
      'Test catalogue'
    );
    expect(profiles[0]?.specs).toHaveLength(1);
  });

  it('drops a second entry for the same model and reports it', () => {
    const { profiles, errors } = parseCatalogue(file([VALID, VALID]), 'Test catalogue');
    expect(profiles).toHaveLength(1);
    expect(errors[0]).toMatch(/duplicate/i);
  });

  it('rejects a file that is not an object', () => {
    expect(parseCatalogue('nope', 'Test catalogue').errors).toHaveLength(1);
    expect(parseCatalogue(null, 'Test catalogue').profiles).toEqual([]);
  });

  it('rejects a file with no profiles array', () => {
    expect(parseCatalogue({ formatVersion: 1 }, 'Test catalogue').errors).toHaveLength(1);
  });

  it('refuses a format version it does not understand', () => {
    const { errors } = parseCatalogue(file([VALID], { formatVersion: 99 }), 'Test catalogue');
    expect(errors[0]).toMatch(/format version/i);
  });
});

describe('parseCatalogue — link safety', () => {
  it('drops a javascript: URL rather than rendering it as a link', () => {
    const { profiles } = parseCatalogue(
      file([{ ...VALID, manualUrl: 'javascript:alert(1)' }]),
      'Test catalogue'
    );
    expect(profiles[0]?.manualUrl).toBeUndefined();
  });

  it('drops a plain http URL, because catalogue links are clicked', () => {
    const { profiles } = parseCatalogue(
      file([{ ...VALID, manualUrl: 'http://example.com/m.pdf' }]),
      'Test catalogue'
    );
    expect(profiles[0]?.manualUrl).toBeUndefined();
  });

  it('drops a data: URL', () => {
    const { profiles } = parseCatalogue(
      file([{ ...VALID, productUrl: 'data:text/html,<script>' }]),
      'Test catalogue'
    );
    expect(profiles[0]?.productUrl).toBeUndefined();
  });

  it('keeps a https URL', () => {
    const { profiles } = parseCatalogue(file([VALID]), 'Test catalogue');
    expect(profiles[0]?.manualUrl).toBe('https://example.com/manual.pdf');
  });

  it('keeps the entry when only its link was bad', () => {
    const { profiles } = parseCatalogue(
      file([{ ...VALID, manualUrl: 'http://example.com' }]),
      'Test catalogue'
    );
    expect(profiles).toHaveLength(1);
  });
});

describe('the bundled catalogue', () => {
  const profiles = bundledCatalogue();

  it('parses without a single error', () => {
    // A shipped file that does not validate would be a broken release.
    expect(profiles.length).toBeGreaterThan(0);
  });

  it('has no two entries for the same make and model', () => {
    expect(indexProfilesByKey(profiles).size).toBe(profiles.length);
  });

  it('carries the licence on every record, so the terms travel with the data', () => {
    expect(profiles.every((p) => p.licence === CATALOGUE_LICENCE)).toBe(true);
  });

  it('covers more than one brand, because brand is data rather than a module', () => {
    expect(new Set(profiles.map((p) => p.brand)).size).toBeGreaterThan(1);
  });

  it('links only over https', () => {
    const links = profiles.flatMap((p) => [p.manualUrl, p.partsUrl, p.productUrl].filter(Boolean));
    expect(links.every((url) => url?.startsWith('https://'))).toBe(true);
  });
});
