import { describe, expect, it } from 'vitest';
import { qrSvg } from '@/lib/labels/qr';

describe('qrSvg', () => {
  it('returns an SVG document for the given text', async () => {
    const svg = await qrSvg('https://gear.example.com/items/abc123');

    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('produces different output for different text', async () => {
    const one = await qrSvg('https://gear.example.com/items/one');
    const two = await qrSvg('https://gear.example.com/items/two');

    expect(one).not.toBe(two);
  });
});
