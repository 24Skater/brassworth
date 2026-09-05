import type { GearProfile } from '@/types';
import { bundledCatalogue, parseCatalogue } from './catalogue';

/**
 * Assembling the set of profiles the app can offer.
 *
 * Three sources, in ascending order of authority:
 *
 *   1. the catalogue that ships with the app
 *   2. a vendor catalogue, when a self-hoster has configured one
 *   3. the organisation's own profiles, which are stored
 *
 * Later sources win for the same make and model. The organisation's own record
 * beats both catalogues because somebody wrote it deliberately, and a catalogue
 * quietly overriding it on the next update would be the app arguing with its
 * user — the same rule `indexProfilesByKey` applies at match time.
 */

/**
 * Merge sources, later ones winning on id.
 *
 * Keyed by id rather than by make and model: a stored profile keeps its own
 * UUID and must not displace a catalogue entry it merely resembles. Both stay
 * available, and `indexProfilesByKey` decides which one an unlinked item
 * matches.
 */
export function mergeProfileSources(...sources: readonly GearProfile[][]): GearProfile[] {
  const byId = new Map<string, GearProfile>();

  for (const source of sources) {
    for (const profile of source) {
      byId.set(profile.id, profile);
    }
  }

  return [...byId.values()];
}

export interface VendorCatalogueResponse {
  configured: boolean;
  name?: string;
  document?: unknown;
  error?: string;
}

/**
 * Fetch the optional vendor catalogue the server may be configured with.
 *
 * Returns an empty list for every failure — no source configured, server not
 * reachable, document rejected. A vendor feed is an enhancement, and the app
 * has a catalogue of its own; a bad one must not take the picker down with it.
 */
export async function fetchVendorCatalogue(
  fetchImpl: typeof fetch = fetch
): Promise<GearProfile[]> {
  let response: Response;
  try {
    response = await fetchImpl('/api/catalogue', { headers: { accept: 'application/json' } });
  } catch {
    return [];
  }

  if (!response.ok) return [];

  let body: VendorCatalogueResponse;
  try {
    body = (await response.json()) as VendorCatalogueResponse;
  } catch {
    return [];
  }

  if (!body.configured || body.document === undefined) return [];

  // Validated by exactly the same rules as the shipped file. A vendor document
  // is not more trusted for having been paid for.
  const { profiles, errors } = parseCatalogue(body.document, body.name ?? 'Vendor catalogue');
  if (errors.length > 0) {
    console.warn('Vendor catalogue had rejected entries:', errors);
  }

  return profiles;
}

/**
 * Every profile available right now.
 *
 * `stored` comes from the storage provider and is scoped to the organisation by
 * the caller; the catalogues are not tenant data and apply everywhere.
 */
export function availableProfiles(
  stored: readonly GearProfile[],
  vendor: readonly GearProfile[] = []
): GearProfile[] {
  return mergeProfileSources(bundledCatalogue(), [...vendor], [...stored]);
}
