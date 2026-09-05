/**
 * Reading a price from a page's structured data.
 *
 * Deliberately **not** HTML scraping. This reads only `application/ld+json`
 * blocks describing a `schema.org/Product` — markup retailers publish on
 * purpose so that machines can read it, which is a materially different act
 * from picking prices out of their layout. Scraping the rendered page would be
 * fragile, generally against terms of service, and rude at any scale.
 *
 * If a page has no structured price, this finds nothing and says so. That is
 * the correct outcome, not a reason to fall back to parsing HTML.
 */

export interface StructuredPrice {
  amount: number;
  currency?: string;
}

const LD_JSON = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/** Every JSON-LD block in a document, ignoring any that will not parse. */
export function extractJsonLd(html: string): unknown[] {
  const blocks: unknown[] = [];

  for (const match of html.matchAll(LD_JSON)) {
    const raw = match[1];
    if (!raw) continue;

    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // A malformed block is the page's problem, not a reason to give up on
      // the others.
    }
  }

  return blocks;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Flatten @graph containers and arrays into a list of candidate nodes. */
function flatten(node: unknown, depth = 0): Record<string, unknown>[] {
  // Guards against a hostile or accidentally recursive document.
  if (depth > 6) return [];

  if (Array.isArray(node)) {
    return node.flatMap((child) => flatten(child, depth + 1));
  }

  if (!isRecord(node)) return [];

  const nested = '@graph' in node ? flatten(node['@graph'], depth + 1) : [];
  return [node, ...nested];
}

function typesOf(node: Record<string, unknown>): string[] {
  const raw = node['@type'];
  if (typeof raw === 'string') return [raw];
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === 'string');
  return [];
}

/** Prices arrive as numbers or as strings, sometimes with separators. */
function toAmount(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;

  if (typeof value === 'string') {
    // Keep digits, one decimal point and a leading minus; drop currency
    // symbols and thousands separators.
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function offersOf(node: Record<string, unknown>): Record<string, unknown>[] {
  const offers = node.offers;
  if (!offers) return [];
  return flatten(offers);
}

/**
 * The lowest structured price on a page.
 *
 * Lowest rather than first: a page often lists several offers for the same
 * product, and the one worth watching is the cheapest way to actually buy it.
 */
export function findStructuredPrice(html: string): StructuredPrice | null {
  let best: StructuredPrice | null = null;

  for (const block of extractJsonLd(html)) {
    for (const node of flatten(block)) {
      const isProduct = typesOf(node).some((type) => /product/i.test(type));
      if (!isProduct) continue;

      for (const offer of offersOf(node)) {
        const amount = toAmount(offer.price ?? offer.lowPrice);
        if (amount === undefined || amount < 0) continue;

        const currency = typeof offer.priceCurrency === 'string' ? offer.priceCurrency : undefined;

        if (!best || amount < best.amount) {
          best = currency ? { amount, currency } : { amount };
        }
      }
    }
  }

  return best;
}
