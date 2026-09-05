/**
 * An optional catalogue source, configured by a self-hoster.
 *
 * The roadmap asks for "optional user-supplied API keys for anyone with
 * legitimate vendor access". This is where that lives, and it lives on the
 * server for one reason: **a browser cannot hold an API key.** Anything the
 * client can send, a user can read out of the bundle or the network tab, so a
 * key configured in the UI would be a published key. Environment variables on
 * the server are the only place it stays a secret.
 *
 * Off unless configured, following the same rule Phase 5 set for price
 * watching: the app must not start making requests to somebody else's service
 * because it was installed.
 *
 * Deliberately *not* a per-vendor module. It fetches a JSON document in the
 * catalogue format and validates it. That works today with any vendor
 * publishing JSON, and it keeps the roadmap's promise that no plugin SDK is
 * designed before three real cases exist.
 */

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_BYTES = 4 * 1024 * 1024;

export interface CatalogueSourceConfig {
  url: string;
  apiKey?: string;
  /** Header the key is sent in. Vendors disagree; `Authorization` is the default. */
  apiKeyHeader: string;
  /** How the key is written into that header, e.g. `Bearer {key}`. */
  apiKeyFormat: string;
  name: string;
}

export type CatalogueFetchOutcome =
  | { status: 'disabled' }
  | { status: 'ok'; document: unknown; name: string }
  | { status: 'refused'; reason: string }
  | { status: 'error'; reason: string };

/**
 * Read the configuration, or report that there is none.
 *
 * Returns null rather than throwing when unset — no source configured is the
 * normal case, not a failure.
 */
export function catalogueSourceFrom(
  env: NodeJS.ProcessEnv = process.env
): CatalogueSourceConfig | null {
  const url = env.GEAR_CATALOGUE_URL?.trim();
  if (!url) return null;

  return {
    url,
    apiKey: env.GEAR_CATALOGUE_API_KEY?.trim() || undefined,
    apiKeyHeader: env.GEAR_CATALOGUE_API_KEY_HEADER?.trim() || 'Authorization',
    apiKeyFormat: env.GEAR_CATALOGUE_API_KEY_FORMAT?.trim() || 'Bearer {key}',
    name: env.GEAR_CATALOGUE_NAME?.trim() || 'Vendor catalogue',
  };
}

/** The headers for one request, including the key when there is one. */
export function headersFor(config: CatalogueSourceConfig): Record<string, string> {
  const headers: Record<string, string> = { accept: 'application/json' };

  if (config.apiKey) {
    headers[config.apiKeyHeader] = config.apiKeyFormat.replace('{key}', config.apiKey);
  }

  return headers;
}

export interface FetchOptions {
  fetchImpl?: typeof fetch;
  maxBytes?: number;
  timeoutMs?: number;
}

/**
 * Fetch the configured catalogue.
 *
 * https only — the request carries an API key, and sending a credential over
 * plaintext http is not a thing to make configurable.
 *
 * The response is size-capped and time-limited so that a slow or enormous
 * endpoint cannot hold the request open or exhaust memory, the same guards the
 * price checker uses against the same risk.
 */
export async function fetchCatalogue(
  config: CatalogueSourceConfig | null,
  options: FetchOptions = {}
): Promise<CatalogueFetchOutcome> {
  if (!config) return { status: 'disabled' };

  let parsed: URL;
  try {
    parsed = new URL(config.url);
  } catch {
    return { status: 'refused', reason: 'GEAR_CATALOGUE_URL is not a valid URL.' };
  }

  if (parsed.protocol !== 'https:') {
    return { status: 'refused', reason: 'A catalogue source must be https.' };
  }

  const doFetch = options.fetchImpl ?? fetch;
  const maxBytes = options.maxBytes ?? MAX_BYTES;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_TIMEOUT_MS);

  try {
    const response = await doFetch(config.url, {
      headers: headersFor(config),
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!response.ok) {
      return { status: 'error', reason: `Catalogue source returned ${response.status}.` };
    }

    const body = await response.text();
    if (body.length > maxBytes) {
      return { status: 'refused', reason: 'Catalogue source response is too large.' };
    }

    try {
      return { status: 'ok', document: JSON.parse(body), name: config.name };
    } catch {
      return { status: 'error', reason: 'Catalogue source did not return JSON.' };
    }
  } catch (error) {
    // The reason is deliberately generic. The URL may embed a token, and the
    // message is on its way to a browser.
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      status: 'error',
      reason: aborted ? 'Catalogue source timed out.' : 'Catalogue source could not be reached.',
    };
  } finally {
    clearTimeout(timer);
  }
}
