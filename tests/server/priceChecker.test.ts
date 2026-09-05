import { describe, it, expect } from 'vitest';
import { extractJsonLd, findStructuredPrice } from '../../server/prices/structured';
import { blocksEverything, isAllowed, parseRobots } from '../../server/prices/robots';
import { HostThrottle, PriceChecker, isPriceWatchEnabled } from '../../server/prices/checker';

const page = (jsonLd: unknown) =>
  `<html><head><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head><body>Price: $999.99</body></html>`;

describe('structured data extraction', () => {
  it('finds nothing in a page with no structured data', () => {
    // The visible "$249.99" is deliberately ignored: reading the layout is
    // scraping, which this does not do.
    expect(findStructuredPrice('<html><body><span>$249.99</span></body></html>')).toBeNull();
  });

  it('reads a price and currency from a Product offer', () => {
    const html = page({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Table Saw',
      offers: { '@type': 'Offer', price: '899.00', priceCurrency: 'USD' },
    });

    expect(findStructuredPrice(html)).toEqual({ amount: 899, currency: 'USD' });
  });

  it('accepts a numeric price', () => {
    const html = page({ '@type': 'Product', offers: { price: 149.5 } });
    expect(findStructuredPrice(html)?.amount).toBe(149.5);
  });

  it('strips currency symbols and thousands separators', () => {
    const html = page({ '@type': 'Product', offers: { price: '$1,299.00' } });
    expect(findStructuredPrice(html)?.amount).toBe(1299);
  });

  it('takes the lowest of several offers', () => {
    const html = page({
      '@type': 'Product',
      offers: [{ price: '950.00' }, { price: '899.00' }, { price: '1100.00' }],
    });

    expect(findStructuredPrice(html)?.amount).toBe(899);
  });

  it('reads lowPrice from an aggregate offer', () => {
    const html = page({
      '@type': 'Product',
      offers: { '@type': 'AggregateOffer', lowPrice: '799.00', highPrice: '999.00' },
    });

    expect(findStructuredPrice(html)?.amount).toBe(799);
  });

  it('looks inside an @graph container', () => {
    const html = page({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'BreadcrumbList' },
        { '@type': 'Product', offers: { price: '425.00' } },
      ],
    });

    expect(findStructuredPrice(html)?.amount).toBe(425);
  });

  it('ignores blocks that are not products', () => {
    const html = page({ '@type': 'Organization', offers: { price: '1.00' } });
    expect(findStructuredPrice(html)).toBeNull();
  });

  it('survives malformed JSON without giving up on the rest', () => {
    const html =
      '<script type="application/ld+json">{ not json </script>' +
      page({ '@type': 'Product', offers: { price: '55.00' } });

    expect(findStructuredPrice(html)?.amount).toBe(55);
  });

  it('extracts several blocks', () => {
    const html = page({ '@type': 'Product' }) + page({ '@type': 'WebPage' });
    expect(extractJsonLd(html)).toHaveLength(2);
  });

  it('ignores a negative price', () => {
    const html = page({ '@type': 'Product', offers: { price: '-10.00' } });
    expect(findStructuredPrice(html)).toBeNull();
  });
});

describe('robots.txt', () => {
  it('allows everything when there are no rules', () => {
    expect(isAllowed(parseRobots(''), '/anything')).toBe(true);
  });

  it('honours a wildcard disallow', () => {
    const rules = parseRobots('User-agent: *\nDisallow: /private');

    expect(isAllowed(rules, '/private/thing')).toBe(false);
    expect(isAllowed(rules, '/public/thing')).toBe(true);
  });

  it('lets a longer allow override a disallow', () => {
    const rules = parseRobots('User-agent: *\nDisallow: /products\nAllow: /products/public');

    expect(isAllowed(rules, '/products/secret')).toBe(false);
    expect(isAllowed(rules, '/products/public/item')).toBe(true);
  });

  it('prefers a group naming us over the wildcard', () => {
    const rules = parseRobots(
      'User-agent: *\nDisallow: /\n\nUser-agent: BrassworthPriceWatch\nDisallow: /admin'
    );

    // The wildcard bans everything; the specific group does not.
    expect(isAllowed(rules, '/products/drill')).toBe(true);
    expect(isAllowed(rules, '/admin/panel')).toBe(false);
  });

  it('reads a crawl delay', () => {
    expect(parseRobots('User-agent: *\nCrawl-delay: 20').crawlDelaySeconds).toBe(20);
  });

  it('ignores comments and blank lines', () => {
    const rules = parseRobots('# a comment\n\nUser-agent: *\nDisallow: /x # trailing');
    expect(isAllowed(rules, '/x/y')).toBe(false);
  });

  it('detects a total ban', () => {
    expect(blocksEverything(parseRobots('User-agent: *\nDisallow: /'))).toBe(true);
    expect(blocksEverything(parseRobots('User-agent: *\nDisallow: /admin'))).toBe(false);
  });
});

describe('HostThrottle', () => {
  it('allows the first request immediately', () => {
    expect(new HostThrottle(10_000).msUntilAllowed('example.com', 1_000)).toBe(0);
  });

  it('makes a second request to the same host wait', () => {
    const throttle = new HostThrottle(10_000);
    throttle.record('example.com', 1_000);

    expect(throttle.msUntilAllowed('example.com', 3_000)).toBe(8_000);
    expect(throttle.msUntilAllowed('example.com', 11_000)).toBe(0);
  });

  it('keeps hosts independent', () => {
    const throttle = new HostThrottle(10_000);
    throttle.record('a.example', 1_000);

    expect(throttle.msUntilAllowed('b.example', 1_000)).toBe(0);
  });

  it('honours a longer crawl delay than our own minimum', () => {
    const throttle = new HostThrottle(10_000);
    throttle.record('example.com', 0);

    expect(throttle.msUntilAllowed('example.com', 5_000, 60)).toBe(55_000);
  });
});

describe('isPriceWatchEnabled', () => {
  it('is off unless explicitly enabled', () => {
    expect(isPriceWatchEnabled({})).toBe(false);
    expect(isPriceWatchEnabled({ PRICE_WATCH_ENABLED: 'false' })).toBe(false);
    expect(isPriceWatchEnabled({ PRICE_WATCH_ENABLED: '1' })).toBe(false);
    expect(isPriceWatchEnabled({ PRICE_WATCH_ENABLED: 'true' })).toBe(true);
  });
});

describe('PriceChecker', () => {
  function checkerWith(handler: (url: string) => Response) {
    return new PriceChecker({
      fetchImpl: (async (input: Parameters<typeof fetch>[0]) =>
        handler(typeof input === 'string' ? input : String(input))) as typeof fetch,
      throttle: new HostThrottle(0),
      now: () => 1_000_000,
    });
  }

  const ok = (body: string) => new Response(body, { status: 200 });

  it('refuses a non-https address', async () => {
    const checker = checkerWith(() => ok(''));
    const outcome = await checker.check('http://example.com/drill');

    expect(outcome).toMatchObject({ status: 'refused' });
  });

  it('refuses something that is not a URL', async () => {
    const checker = checkerWith(() => ok(''));
    expect((await checker.check('not a url')).status).toBe('refused');
  });

  it('obeys a robots.txt that disallows the path', async () => {
    const checker = checkerWith((url) =>
      url.endsWith('/robots.txt')
        ? ok('User-agent: *\nDisallow: /products')
        : ok(page({ '@type': 'Product', offers: { price: '10.00' } }))
    );

    expect((await checker.check('https://example.com/products/drill')).status).toBe(
      'blocked-by-robots'
    );
  });

  it('refuses when robots.txt cannot be read, rather than assuming permission', async () => {
    const checker = checkerWith((url) =>
      url.endsWith('/robots.txt') ? new Response('', { status: 500 }) : ok('')
    );

    expect((await checker.check('https://example.com/drill')).status).toBe('refused');
  });

  it('treats a missing robots.txt as no restrictions', async () => {
    const checker = checkerWith((url) =>
      url.endsWith('/robots.txt')
        ? new Response('', { status: 404 })
        : ok(page({ '@type': 'Product', offers: { price: '425.00' } }))
    );

    const outcome = await checker.check('https://example.com/drill');
    expect(outcome).toMatchObject({ status: 'ok', price: { amount: 425 } });
  });

  it('reports when a page has no structured price', async () => {
    const checker = checkerWith((url) =>
      url.endsWith('/robots.txt') ? new Response('', { status: 404 }) : ok('<html></html>')
    );

    expect((await checker.check('https://example.com/drill')).status).toBe('no-price');
  });

  it('reports a failing page rather than throwing', async () => {
    const checker = checkerWith((url) =>
      url.endsWith('/robots.txt')
        ? new Response('', { status: 404 })
        : new Response('', { status: 503 })
    );

    expect((await checker.check('https://example.com/drill')).status).toBe('error');
  });

  it('throttles a second request to the same host', async () => {
    const throttle = new HostThrottle(10_000);
    let clock = 1_000;

    const checker = new PriceChecker({
      fetchImpl: (async (input: Parameters<typeof fetch>[0]) => {
        const url = typeof input === 'string' ? input : String(input);
        return url.endsWith('/robots.txt')
          ? new Response('', { status: 404 })
          : ok(page({ '@type': 'Product', offers: { price: '10.00' } }));
      }) as typeof fetch,
      throttle,
      now: () => clock,
    });

    expect((await checker.check('https://example.com/a')).status).toBe('ok');

    clock = 2_000;
    const second = await checker.check('https://example.com/b');
    expect(second).toMatchObject({ status: 'throttled' });
  });
});
