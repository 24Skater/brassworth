import { describe, it, expect } from 'vitest';
import {
  normaliseBrand,
  normaliseModel,
  profileKey,
  indexProfilesByKey,
  matchProfile,
  searchProfiles,
  specValue,
  applyProfile,
  profileGaps,
} from '@/lib/gear';
import type { GearProfile, Item } from '@/types';

function profile(over: Partial<GearProfile> = {}): GearProfile {
  return {
    id: over.id ?? 'p1',
    brand: over.brand ?? 'DeWalt',
    model: over.model ?? 'DCD791D2',
    productType: over.productType ?? 'Cordless drill',
    specs: over.specs ?? [
      { label: 'Voltage', value: '20', unit: 'V' },
      { label: 'Chuck', value: '1/2 in' },
    ],
    manualUrl: over.manualUrl,
    partsUrl: over.partsUrl,
    productUrl: over.productUrl,
    source: over.source ?? 'CATALOGUE',
    licence: over.licence,
    sourceName: over.sourceName,
    organizationId: over.organizationId,
    createdAt: over.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: over.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

function item(over: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    organizationId: 'org1',
    name: 'Drill',
    condition: 'GOOD',
    quantity: 1,
    isArchived: false,
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('normaliseBrand', () => {
  it('folds case so DEWALT and DeWalt are the same brand', () => {
    expect(normaliseBrand('DEWALT')).toBe(normaliseBrand('DeWalt'));
  });

  it('folds spacing and punctuation so "De Walt" matches "DeWalt"', () => {
    expect(normaliseBrand('De Walt')).toBe(normaliseBrand('DeWalt'));
    expect(normaliseBrand('Milwaukee.')).toBe(normaliseBrand('milwaukee'));
  });

  it('returns an empty string for blank or missing input', () => {
    expect(normaliseBrand('')).toBe('');
    expect(normaliseBrand('   ')).toBe('');
    expect(normaliseBrand(undefined)).toBe('');
  });

  it('keeps digits, because some brands have them', () => {
    expect(normaliseBrand('3M')).toBe('3m');
  });
});

describe('normaliseModel', () => {
  it('ignores hyphens and spacing that vary between catalogues', () => {
    expect(normaliseModel('DCD-791 D2')).toBe(normaliseModel('dcd791d2'));
  });

  it('returns an empty string for blank input', () => {
    expect(normaliseModel(undefined)).toBe('');
    expect(normaliseModel(' - ')).toBe('');
  });
});

describe('profileKey', () => {
  it('is stable across formatting differences on both halves', () => {
    expect(profileKey('De Walt', 'dcd-791d2')).toBe(profileKey('DEWALT', 'DCD791D2'));
  });

  it('is empty when either half is missing, so blanks never collide', () => {
    expect(profileKey('DeWalt', '')).toBe('');
    expect(profileKey('', 'DCD791D2')).toBe('');
  });
});

describe('indexProfilesByKey', () => {
  it('indexes by normalised brand and model', () => {
    const index = indexProfilesByKey([profile()]);
    expect(index.get(profileKey('dewalt', 'dcd791d2'))?.id).toBe('p1');
  });

  it('prefers a user profile over a catalogue one for the same model', () => {
    const index = indexProfilesByKey([
      profile({ id: 'cat', source: 'CATALOGUE' }),
      profile({ id: 'mine', source: 'USER' }),
    ]);
    expect(index.get(profileKey('dewalt', 'dcd791d2'))?.id).toBe('mine');
  });

  it('skips profiles missing a brand or model rather than keying them as empty', () => {
    const index = indexProfilesByKey([profile({ id: 'bad', model: '' })]);
    expect(index.size).toBe(0);
  });
});

describe('matchProfile', () => {
  const profiles = [profile()];

  it('returns the linked profile when the item names one', () => {
    const linked = profile({ id: 'linked', brand: 'Makita', model: 'XPH12Z' });
    const found = matchProfile(item({ gearProfileId: 'linked' }), [...profiles, linked]);
    expect(found?.id).toBe('linked');
  });

  it('falls back to brand and model when nothing is linked', () => {
    const found = matchProfile(item({ brand: 'dewalt', model: 'dcd 791 d2' }), profiles);
    expect(found?.id).toBe('p1');
  });

  it('returns null when the link points at a profile that is gone', () => {
    expect(matchProfile(item({ gearProfileId: 'deleted' }), profiles)).toBeNull();
  });

  it('returns null when brand and model match nothing', () => {
    expect(matchProfile(item({ brand: 'Ryobi', model: 'P252' }), profiles)).toBeNull();
  });

  it('returns null for an item with no brand or model at all', () => {
    expect(matchProfile(item(), profiles)).toBeNull();
  });
});

describe('searchProfiles', () => {
  const profiles = [
    profile({ id: 'a', brand: 'DeWalt', model: 'DCD791D2', productType: 'Cordless drill' }),
    profile({ id: 'b', brand: 'DeWalt', model: 'DCS570B', productType: 'Circular saw' }),
    profile({ id: 'c', brand: 'Makita', model: 'XPH12Z', productType: 'Hammer drill' }),
  ];

  it('returns everything for an empty query', () => {
    expect(searchProfiles(profiles, '')).toHaveLength(3);
  });

  it('ranks an exact model match first', () => {
    expect(searchProfiles(profiles, 'DCS570B')[0].id).toBe('b');
  });

  it('matches on brand', () => {
    expect(searchProfiles(profiles, 'makita').map((p) => p.id)).toEqual(['c']);
  });

  it('matches on product type, so "drill" finds both drills', () => {
    expect(
      searchProfiles(profiles, 'drill')
        .map((p) => p.id)
        .sort()
    ).toEqual(['a', 'c']);
  });

  it('matches across brand and model together', () => {
    expect(searchProfiles(profiles, 'dewalt dcs').map((p) => p.id)).toEqual(['b']);
  });

  it('ignores punctuation in the query', () => {
    expect(searchProfiles(profiles, 'dcd-791')[0].id).toBe('a');
  });

  it('honours a limit', () => {
    expect(searchProfiles(profiles, 'dewalt', 1)).toHaveLength(1);
  });

  it('returns nothing when there is no match', () => {
    expect(searchProfiles(profiles, 'festool')).toEqual([]);
  });
});

describe('specValue', () => {
  it('reads a spec by label, case-insensitively', () => {
    expect(specValue(profile(), 'voltage')).toBe('20 V');
  });

  it('omits the unit when there is none', () => {
    expect(specValue(profile(), 'Chuck')).toBe('1/2 in');
  });

  it('returns undefined for a label the profile does not carry', () => {
    expect(specValue(profile(), 'Weight')).toBeUndefined();
  });
});

describe('applyProfile', () => {
  it('fills a blank brand and model from the profile', () => {
    expect(applyProfile(item(), profile())).toMatchObject({
      brand: 'DeWalt',
      model: 'DCD791D2',
      gearProfileId: 'p1',
    });
  });

  it('never overwrites a value the user already typed', () => {
    const applied = applyProfile(item({ brand: 'DEWALT (used)', model: 'DCD791D2' }), profile());
    expect(applied.brand).toBe('DEWALT (used)');
  });

  it('fills a blank name from brand and model', () => {
    expect(applyProfile(item({ name: '' }), profile()).name).toBe('DeWalt DCD791D2');
  });

  it('leaves a name the user gave alone', () => {
    expect(applyProfile(item({ name: 'Second drill' }), profile()).name).toBe('Second drill');
  });

  it('does not mutate the item it was given', () => {
    const original = item();
    applyProfile(original, profile());
    expect(original.gearProfileId).toBeUndefined();
  });
});

describe('profileGaps', () => {
  it('names the fields a profile could fill and the item has not', () => {
    expect(profileGaps(item(), profile())).toEqual(['brand', 'model']);
  });

  it('is empty when the item already carries everything', () => {
    expect(profileGaps(item({ brand: 'DeWalt', model: 'DCD791D2' }), profile())).toEqual([]);
  });
});
