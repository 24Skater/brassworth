import { describe, it, expect } from 'vitest';
import {
  catalogueSourceFrom,
  fetchCatalogue,
  headersFor,
  type CatalogueSourceConfig,
} from '../../server/gear/catalogueSource';

function config(over: Partial<CatalogueSourceConfig> = {}): CatalogueSourceConfig {
  return {
    url: 'https://vendor.example/catalogue.json',
    apiKeyHeader: 'Authorization',
    apiKeyFormat: 'Bearer {key}',
    name: 'Vendor catalogue',
    ...over,
  };
}

function respondWith(body: string, init: ResponseInit = {}): typeof fetch {
  return (async () => new Response(body, { status: 200, ...init })) as unknown as typeof fetch;
}

describe('catalogueSourceFrom', () => {
  it('is off when no URL is configured', () => {
    expect(catalogueSourceFrom({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it('is off when the URL is blank rather than absent', () => {
    expect(catalogueSourceFrom({ GEAR_CATALOGUE_URL: '   ' } as NodeJS.ProcessEnv)).toBeNull();
  });

  it('reads the URL when one is set', () => {
    const source = catalogueSourceFrom({
      GEAR_CATALOGUE_URL: 'https://vendor.example/c.json',
    } as NodeJS.ProcessEnv);
    expect(source?.url).toBe('https://vendor.example/c.json');
  });

  it('defaults the key header and format, because most vendors use bearer tokens', () => {
    const source = catalogueSourceFrom({
      GEAR_CATALOGUE_URL: 'https://vendor.example/c.json',
      GEAR_CATALOGUE_API_KEY: 'secret',
    } as NodeJS.ProcessEnv);
    expect(source).toMatchObject({ apiKeyHeader: 'Authorization', apiKeyFormat: 'Bearer {key}' });
  });

  it('lets a vendor that wants a different header have one', () => {
    const source = catalogueSourceFrom({
      GEAR_CATALOGUE_URL: 'https://vendor.example/c.json',
      GEAR_CATALOGUE_API_KEY: 'secret',
      GEAR_CATALOGUE_API_KEY_HEADER: 'X-Api-Key',
      GEAR_CATALOGUE_API_KEY_FORMAT: '{key}',
    } as NodeJS.ProcessEnv);
    expect(headersFor(source as CatalogueSourceConfig)['X-Api-Key']).toBe('secret');
  });
});

describe('headersFor', () => {
  it('sends no credential when none is configured', () => {
    expect(headersFor(config()).Authorization).toBeUndefined();
  });

  it('writes the key into the configured format', () => {
    expect(headersFor(config({ apiKey: 'abc123' })).Authorization).toBe('Bearer abc123');
  });
});

describe('fetchCatalogue', () => {
  it('reports disabled when nothing is configured, rather than failing', async () => {
    expect(await fetchCatalogue(null)).toEqual({ status: 'disabled' });
  });

  it('refuses plain http, because the request carries a credential', async () => {
    const outcome = await fetchCatalogue(config({ url: 'http://vendor.example/c.json' }));
    expect(outcome).toMatchObject({ status: 'refused' });
  });

  it('refuses a URL it cannot parse', async () => {
    expect(await fetchCatalogue(config({ url: 'not a url' }))).toMatchObject({
      status: 'refused',
    });
  });

  it('returns the parsed document on success', async () => {
    const outcome = await fetchCatalogue(config(), {
      fetchImpl: respondWith('{"formatVersion":1,"profiles":[]}'),
    });
    expect(outcome).toMatchObject({ status: 'ok', name: 'Vendor catalogue' });
  });

  it('sends the API key on the request', async () => {
    let seen: Record<string, string> | undefined;
    const spy = (async (_url: string, init?: RequestInit) => {
      seen = init?.headers as Record<string, string>;
      return new Response('{"formatVersion":1,"profiles":[]}');
    }) as unknown as typeof fetch;

    await fetchCatalogue(config({ apiKey: 'abc123' }), { fetchImpl: spy });
    expect(seen?.Authorization).toBe('Bearer abc123');
  });

  it('reports an error status rather than throwing on a 500', async () => {
    const outcome = await fetchCatalogue(config(), {
      fetchImpl: respondWith('nope', { status: 500 }),
    });
    expect(outcome).toMatchObject({ status: 'error' });
  });

  it('reports an error when the body is not JSON', async () => {
    const outcome = await fetchCatalogue(config(), { fetchImpl: respondWith('<html>') });
    expect(outcome).toMatchObject({ status: 'error' });
  });

  it('refuses a response larger than the cap', async () => {
    const outcome = await fetchCatalogue(config(), {
      fetchImpl: respondWith('x'.repeat(200)),
      maxBytes: 100,
    });
    expect(outcome).toMatchObject({ status: 'refused' });
  });

  it('does not leak the URL or the key into the failure reason', async () => {
    const failing = (async () => {
      throw new Error('connect ECONNREFUSED https://vendor.example/c.json?token=secret');
    }) as unknown as typeof fetch;

    const outcome = await fetchCatalogue(config({ apiKey: 'secret' }), { fetchImpl: failing });
    const reason = outcome.status === 'error' ? outcome.reason : '';
    expect(reason).not.toContain('secret');
    expect(reason).not.toContain('vendor.example');
  });
});
