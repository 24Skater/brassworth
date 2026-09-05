import { findStructuredPrice, type StructuredPrice } from './structured';
import { USER_AGENT, isAllowed, parseRobots, type RobotsRules } from './robots';

/**
 * Checking a watched price.
 *
 * Off unless a self-hoster turns it on. It makes automated requests to other
 * people's servers, so it should be a deliberate choice rather than something
 * that starts happening because the app was installed.
 *
 * The rules it keeps to:
 *   - robots.txt is fetched once per host and obeyed
 *   - one request per host at a time, with a minimum gap between them
 *   - only https, and only structured data — never the rendered HTML
 *   - a short timeout and a small response cap, so a slow or enormous page
 *     cannot hold the job open or exhaust memory
 */

export const DEFAULT_MIN_HOST_INTERVAL_MS = 10_000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_BYTES = 2 * 1024 * 1024;

export function isPriceWatchEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PRICE_WATCH_ENABLED === 'true';
}

/** Minimum gap between requests to one host, honouring its Crawl-delay. */
export class HostThrottle {
  private readonly lastRequest = new Map<string, number>();

  constructor(private readonly minIntervalMs = DEFAULT_MIN_HOST_INTERVAL_MS) {}

  msUntilAllowed(host: string, now: number, crawlDelaySeconds?: number): number {
    const last = this.lastRequest.get(host);
    if (last === undefined) return 0;

    // A host that asks for longer gets longer.
    const required = Math.max(this.minIntervalMs, (crawlDelaySeconds ?? 0) * 1000);
    return Math.max(0, last + required - now);
  }

  record(host: string, now: number): void {
    this.lastRequest.set(host, now);
  }
}

export type CheckOutcome =
  | { status: 'ok'; price: StructuredPrice }
  | { status: 'no-price' }
  | { status: 'blocked-by-robots' }
  | { status: 'throttled'; retryAfterMs: number }
  | { status: 'refused'; reason: string }
  | { status: 'error'; reason: string };

export interface CheckerOptions {
  fetchImpl?: typeof fetch;
  throttle?: HostThrottle;
  now?: () => number;
}

export class PriceChecker {
  private readonly doFetch: typeof fetch;
  private readonly throttle: HostThrottle;
  private readonly now: () => number;
  private readonly robotsByHost = new Map<string, RobotsRules | null>();

  constructor(options: CheckerOptions = {}) {
    this.doFetch = options.fetchImpl ?? ((...args) => fetch(...args));
    this.throttle = options.throttle ?? new HostThrottle();
    this.now = options.now ?? (() => Date.now());
  }

  private async loadRobots(origin: string, host: string): Promise<RobotsRules | null> {
    if (this.robotsByHost.has(host)) return this.robotsByHost.get(host) ?? null;

    let rules: RobotsRules | null;
    try {
      const response = await this.doFetch(`${origin}/robots.txt`, {
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.status === 404) {
        // No robots.txt means no restrictions, which is the one case where
        // absence really does mean permission.
        rules = { disallow: [], allow: [] };
      } else if (!response.ok) {
        rules = null;
      } else {
        rules = parseRobots(await response.text());
      }
    } catch {
      // Could not ask, so do not proceed.
      rules = null;
    }

    this.robotsByHost.set(host, rules);
    return rules;
  }

  async check(rawUrl: string): Promise<CheckOutcome> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return { status: 'refused', reason: 'That is not a valid address.' };
    }

    // Plain http would leak the fact of the check and is trivially spoofable.
    if (url.protocol !== 'https:') {
      return { status: 'refused', reason: 'Only https addresses are checked.' };
    }

    const rules = await this.loadRobots(url.origin, url.host);
    if (!rules) {
      return { status: 'refused', reason: 'Could not read that site rules for automated access.' };
    }
    if (!isAllowed(rules, url.pathname)) {
      return { status: 'blocked-by-robots' };
    }

    const wait = this.throttle.msUntilAllowed(url.host, this.now(), rules.crawlDelaySeconds);
    if (wait > 0) {
      return { status: 'throttled', retryAfterMs: wait };
    }

    this.throttle.record(url.host, this.now());

    let html: string;
    try {
      const response = await this.doFetch(url.href, {
        headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        redirect: 'follow',
      });

      if (!response.ok) {
        return { status: 'error', reason: `The site responded ${response.status}.` };
      }

      const body = await response.text();
      // Truncating still leaves the JSON-LD, which sits in the head.
      html = body.length > MAX_BYTES ? body.slice(0, MAX_BYTES) : body;
    } catch {
      return { status: 'error', reason: 'Could not reach that page.' };
    }

    const price = findStructuredPrice(html);
    return price ? { status: 'ok', price } : { status: 'no-price' };
  }
}
