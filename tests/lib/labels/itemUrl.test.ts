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

  it('refuses an id that decodes to a path, however it was escaped', () => {
    // itemUrl escapes a separator, but the parser decodes it again, so a
    // value like this comes back as a real path and a router walks out of
    // /items/ with it. Anybody can print a sticker; nobody should be able to
    // print one that lands somebody on another screen.
    expect(parseItemUrl(itemUrl('a/b', ORIGIN), ORIGIN)).toBeNull();
  });

  it('refuses a traversal dressed up as an id', () => {
    expect(parseItemUrl(`${ORIGIN}/items/%2E%2E%2F%2E%2E%2Fauth`, ORIGIN)).toBeNull();
    expect(parseItemUrl(`${ORIGIN}/items/%2E%2E`, ORIGIN)).toBeNull();
    expect(parseItemUrl(`${ORIGIN}/items/%2E`, ORIGIN)).toBeNull();
  });

  it('refuses an empty id', () => {
    expect(parseItemUrl(`${ORIGIN}/items/%20`, ORIGIN)).toBe(' ');
    expect(parseItemUrl(`${ORIGIN}/items/`, ORIGIN)).toBeNull();
  });

  it('still reads back a real id, which is a uuid', () => {
    const id = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
    expect(parseItemUrl(itemUrl(id, ORIGIN), ORIGIN)).toBe(id);
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
