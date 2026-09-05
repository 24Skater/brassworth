import type { GearProfile, GearSpec } from '@/types';
import { profileKey } from './index';
import catalogueFile from '@/catalogue/gear.json';

/**
 * The community catalogue.
 *
 * A plain JSON file of makes and models, parsed into read-only gear profiles.
 *
 * **Catalogue records are never written to storage.** They ship with the app,
 * so persisting them would copy a read-only dataset into every tenant's
 * storage, bloat every backup with data that is not the user's, and turn a
 * catalogue update into a migration. Only the profiles somebody writes
 * themselves are stored; the catalogue is merged in at read time.
 *
 * That decision is what makes the ids below matter: an item links to a
 * catalogue profile by id, and the id has to survive the catalogue being
 * updated, re-ordered, or swapped for a vendor feed. So it is *derived from the
 * make and model*, not assigned. The link is to a model, not to a row in a
 * file.
 */

/**
 * The licence the shipped catalogue is published under.
 *
 * ODbL, not a Creative Commons licence: this is a database of facts, and ODbL
 * is the licence written for that case — the one OpenStreetMap uses. Its
 * share-alike terms are also the "licence we control" the roadmap asks for; CC0
 * would be easier to contribute to and would give away exactly that control.
 *
 * See `src/catalogue/LICENCE.md`.
 */
export const CATALOGUE_LICENCE = 'ODbL-1.0';

/** The only format version this build understands. */
export const CATALOGUE_FORMAT_VERSION = 1;

const ID_PREFIX = 'catalogue:';

/** The stable id for a make and model. Derived, never assigned — see above. */
export function catalogueProfileId(brand: string, model: string): string {
  return `${ID_PREFIX}${profileKey(brand, model)}`;
}

/** Whether an id belongs to the catalogue rather than to a stored user profile. */
export function isCatalogueProfile(id: string): boolean {
  return id.startsWith(ID_PREFIX);
}

export interface CatalogueParseResult {
  profiles: GearProfile[];
  /** One line per rejected entry. A self-hoster with a bad file gets told which row. */
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, max = 120): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return undefined;
  return trimmed;
}

/**
 * A link the app is willing to render.
 *
 * https only. These URLs come from a file the app did not write — the shipped
 * catalogue today, a vendor feed tomorrow — and they are rendered as links a
 * user clicks. `javascript:` is script execution, `data:` is a page under our
 * own origin, and plain `http` is a downgrade someone can sit in the middle of.
 * None of those are worth a manual link.
 */
function safeUrl(value: unknown): string | undefined {
  const raw = text(value, 2000);
  if (!raw) return undefined;

  try {
    return new URL(raw).protocol === 'https:' ? raw : undefined;
  } catch {
    return undefined;
  }
}

function parseSpecs(value: unknown): GearSpec[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 80).flatMap((entry): GearSpec[] => {
    if (!isRecord(entry)) return [];

    const label = text(entry.label, 80);
    const specValue = text(entry.value, 200);
    if (!label || !specValue) return [];

    const unit = text(entry.unit, 20);
    return [unit ? { label, value: specValue, unit } : { label, value: specValue }];
  });
}

/**
 * Parse a catalogue file.
 *
 * Never throws, and never returns nothing because one row was wrong. A bad
 * entry is dropped and named; the rest load. A file that fails wholesale — not
 * an object, no profiles, a format version from the future — yields one error
 * explaining which.
 */
export function parseCatalogue(input: unknown, sourceName: string): CatalogueParseResult {
  if (!isRecord(input)) {
    return { profiles: [], errors: [`${sourceName}: not a catalogue file.`] };
  }

  if (input.formatVersion !== CATALOGUE_FORMAT_VERSION) {
    return {
      profiles: [],
      errors: [
        `${sourceName}: format version ${String(input.formatVersion)} is not supported ` +
          `(this build reads version ${CATALOGUE_FORMAT_VERSION}).`,
      ],
    };
  }

  if (!Array.isArray(input.profiles)) {
    return { profiles: [], errors: [`${sourceName}: has no profiles array.`] };
  }

  const licence = text(input.licence, 200) ?? CATALOGUE_LICENCE;
  const stamp = text(input.updatedAt, 40) ?? '1970-01-01T00:00:00.000Z';

  const profiles: GearProfile[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  input.profiles.forEach((entry, index) => {
    const where = `${sourceName}: entry ${index + 1}`;

    if (!isRecord(entry)) {
      errors.push(`${where} is not an object.`);
      return;
    }

    const brand = text(entry.brand);
    const model = text(entry.model);

    if (!brand || !model) {
      errors.push(`${where} needs both a brand and a model.`);
      return;
    }

    const id = catalogueProfileId(brand, model);
    if (seen.has(id)) {
      errors.push(`${where} is a duplicate of ${brand} ${model}.`);
      return;
    }
    seen.add(id);

    // `source`, `licence` and `organizationId` are set here, never read from
    // the file. A catalogue must not be able to declare its rows editable
    // user records, relicense itself, or claim to belong to an organisation.
    profiles.push({
      id,
      brand,
      model,
      productType: text(entry.productType),
      specs: parseSpecs(entry.specs),
      manualUrl: safeUrl(entry.manualUrl),
      partsUrl: safeUrl(entry.partsUrl),
      productUrl: safeUrl(entry.productUrl),
      source: 'CATALOGUE',
      licence,
      sourceName,
      createdAt: stamp,
      updatedAt: stamp,
    });
  });

  return { profiles, errors };
}

let bundled: GearProfile[] | undefined;

/**
 * The catalogue that ships with the app.
 *
 * Parsed once and cached — the file does not change at runtime, and every item
 * page would otherwise re-validate the whole thing.
 */
export function bundledCatalogue(): GearProfile[] {
  if (!bundled) {
    const parsed = parseCatalogue(catalogueFile, catalogueName());
    bundled = parsed.profiles;

    if (parsed.errors.length > 0) {
      // A shipped file that does not validate is a broken release, and the
      // tests assert it never happens. In a browser, say so rather than
      // silently offering a short catalogue.
      console.error('Bundled gear catalogue has invalid entries:', parsed.errors);
    }
  }

  return bundled;
}

/** The shipped catalogue's own name, for display and attribution. */
export function catalogueName(): string {
  const name = (catalogueFile as { name?: unknown }).name;
  return typeof name === 'string' ? name : 'Community catalogue';
}
