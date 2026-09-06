import { describe, expect, it } from 'vitest';
import { itemUrl, parseItemUrl } from '@/lib/labels/itemUrl';

const ORIGIN = 'https://gear.example.com';

describe('itemUrl', () => {
  it('builds an absolute URL for an item', () => {
    expect(itemUrl('abc123', ORIGIN)).toBe('https://gear.example.com/items/abc123');
  });

  it('encodes an id that would otherwise change the path', () => {
    expect(itemUrl('a/b', ORIGIN)).toBe('https://gear.example.com/items/a%2Fb');
  });
});

describe('parseItemUrl', () => {
  it('reads the id back out of a URL it built', () => {
    expect(parseItemUrl(itemUrl('abc123', ORIGIN), ORIGIN)).toBe('abc123');
  });

  it('decodes an escaped id', () => {
    expect(parseItemUrl(itemUrl('a/b', ORIGIN), ORIGIN)).toBe('a/b');
  });

  it('refuses a URL from another origin', () => {
    expect(parseItemUrl('https://evil.example.com/items/abc123', ORIGIN)).toBeNull();
  });

  it('refuses a URL on the right origin that is not an item', () => {
    expect(parseItemUrl('https://gear.example.com/settings', ORIGIN)).toBeNull();
  });

  it('refuses a bare identifier, which carries no origin to check', () => {
    expect(parseItemUrl('abc123', ORIGIN)).toBeNull();
  });

  it('refuses text that is not a URL at all', () => {
    expect(parseItemUrl('MADE IN CHINA', ORIGIN)).toBeNull();
  });

  it('refuses a javascript: URL', () => {
    expect(parseItemUrl('javascript:alert(1)', ORIGIN)).toBeNull();
  });
});
