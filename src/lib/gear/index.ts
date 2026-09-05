import type { GearProfile, Item } from '@/types';

/**
 * Gear profiles — a make and model described once, shared by every item that is one.
 *
 * Pure functions only. Nothing here reads storage or the clock, the same shape
 * as the lifecycle, valuation and wishlist rules, and for the same reason:
 * matching rules deserve tests that cannot drift.
 *
 * The central decision in this file is that **brand is data**. There is no
 * per-vendor module, no registry of supported makes, and no directory named
 * after anyone's trademark. Adding Festool is adding a row.
 */

/**
 * Fold a brand to a matching key.
 *
 * Catalogues, packaging and users all disagree about spacing and punctuation —
 * `DeWalt`, `DEWALT` and `De Walt` are one brand, and matching has to know
 * that. Digits survive because some brands are partly numeric (3M).
 */
export function normaliseBrand(brand?: string | null): string {
  if (!brand) return '';
  return brand.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Fold a model number to a matching key.
 *
 * Same problem as brands and worse: `DCD791D2`, `DCD-791D2` and `DCD 791 D2`
 * are one model, and which one you get depends on whether it was read off the
 * box, the data plate or a retailer's website.
 */
export function normaliseModel(model?: string | null): string {
  if (!model) return '';
  return model.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * The identity of a make and model.
 *
 * Empty when either half is missing. That is deliberate: an item with a brand
 * and no model must not key to the same slot as every other brandless item,
 * which is what a naive join of two blanks would do.
 */
export function profileKey(brand?: string | null, model?: string | null): string {
  const b = normaliseBrand(brand);
  const m = normaliseModel(model);
  if (!b || !m) return '';
  return `${b}::${m}`;
}

/**
 * Index profiles for lookup by make and model.
 *
 * A USER profile wins over a CATALOGUE one for the same model. Somebody who
 * has corrected a spec for their own gear meant it, and the shipped catalogue
 * should not quietly override them on the next update.
 */
export function indexProfilesByKey(profiles: readonly GearProfile[]): Map<string, GearProfile> {
  const index = new Map<string, GearProfile>();

  for (const profile of profiles) {
    const key = profileKey(profile.brand, profile.model);
    if (!key) continue;

    const existing = index.get(key);
    if (existing && existing.source === 'USER' && profile.source !== 'USER') continue;

    index.set(key, profile);
  }

  return index;
}

/**
 * The profile for an item, if there is one.
 *
 * An explicit link wins over a brand-and-model guess, because the link is a
 * decision somebody made and the guess is inference. A link pointing at a
 * profile that has since been deleted resolves to null rather than silently
 * falling back — the item says it is a specific model, and quietly matching it
 * to a different one would be worse than showing nothing.
 */
export function matchProfile(item: Item, profiles: readonly GearProfile[]): GearProfile | null {
  if (item.gearProfileId) {
    return profiles.find((p) => p.id === item.gearProfileId) ?? null;
  }

  const key = profileKey(item.brand, item.model);
  if (!key) return null;

  return indexProfilesByKey(profiles).get(key) ?? null;
}

/** Everything a query could reasonably be matched against, folded once. */
function haystack(profile: GearProfile): string {
  return [profile.brand, profile.model, profile.productType]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function foldQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Search the catalogue.
 *
 * Every query term must match somewhere — `dewalt dcs` finds the DeWalt saw and
 * not the DeWalt drill, which is what someone typing two words means. Ranking
 * then puts an exact model hit above a partial one, because when a model number
 * is typed in full it is almost never a coincidence.
 */
export function searchProfiles(
  profiles: readonly GearProfile[],
  query: string,
  limit?: number
): GearProfile[] {
  const terms = foldQuery(query);

  const scored = profiles
    .map((profile) => {
      const text = haystack(profile);
      const compact = text.replace(/[^a-z0-9]/g, '');
      const model = normaliseModel(profile.model);

      const matchesAll = terms.every((term) => text.includes(term) || compact.includes(term));
      if (!matchesAll) return null;

      let score = 0;
      for (const term of terms) {
        if (model === term) score += 100;
        else if (model.startsWith(term)) score += 50;
        else if (model.includes(term)) score += 20;
        else if (normaliseBrand(profile.brand).includes(term)) score += 10;
        else score += 1;
      }

      return { profile, score };
    })
    .filter((entry): entry is { profile: GearProfile; score: number } => entry !== null);

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.profile.brand.localeCompare(b.profile.brand) ||
      a.profile.model.localeCompare(b.profile.model)
  );

  const ordered = scored.map((entry) => entry.profile);
  return typeof limit === 'number' ? ordered.slice(0, limit) : ordered;
}

/** One spec, rendered with its unit. Undefined when the profile does not carry it. */
export function specValue(profile: GearProfile, label: string): string | undefined {
  const wanted = label.trim().toLowerCase();
  const spec = profile.specs.find((s) => s.label.trim().toLowerCase() === wanted);
  if (!spec) return undefined;
  return spec.unit ? `${spec.value} ${spec.unit}` : spec.value;
}

/** The item fields a profile is able to fill. */
const FILLABLE = ['brand', 'model'] as const;
type FillableField = (typeof FILLABLE)[number];

function isBlank(value?: string): boolean {
  return !value || value.trim() === '';
}

/**
 * Which of those fields the item has left blank.
 *
 * Used to tell someone what linking a profile will actually change, rather than
 * applying it and letting them discover it afterwards.
 */
export function profileGaps(item: Item, profile: GearProfile): FillableField[] {
  return FILLABLE.filter((field) => isBlank(item[field]) && !isBlank(profile[field]));
}

/**
 * Link a profile to an item and fill what the item has left blank.
 *
 * Blank fields only, never an overwrite. Somebody who typed `DEWALT (used)` in
 * the brand box meant something by it, and a catalogue tidying it to `DeWalt`
 * would be the app arguing with its user. Specs are *not* copied onto the item:
 * they live on the profile so that correcting one fixes every item sharing the
 * model, which is the entire reason profiles exist rather than more item fields.
 */
export function applyProfile(item: Item, profile: GearProfile): Item {
  const filled: Partial<Item> = {};

  for (const field of profileGaps(item, profile)) {
    filled[field] = profile[field];
  }

  const name = isBlank(item.name)
    ? [profile.brand, profile.model].filter(Boolean).join(' ').trim()
    : item.name;

  return { ...item, ...filled, name, gearProfileId: profile.id };
}

/** A display label for a profile — what a picker row and a linked badge both show. */
export function profileLabel(profile: GearProfile): string {
  return [profile.brand, profile.model].filter(Boolean).join(' ').trim();
}
