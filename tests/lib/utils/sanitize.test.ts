import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeText, sanitizeUrl, sanitizeAttribute } from '@/lib/utils/sanitize';

describe('sanitize', () => {
  describe('sanitizeHtml', () => {
    it('should remove dangerous HTML tags', () => {
      const dangerous = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = sanitizeHtml(dangerous);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Safe content');
    });

    it('should allow safe HTML tags', () => {
      const safe = '<p>Paragraph</p><b>Bold</b><i>Italic</i>';
      const sanitized = sanitizeHtml(safe);
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<b>');
    });

    it('should remove event handlers', () => {
      const withEvent = '<p onclick="alert(1)">Click me</p>';
      const sanitized = sanitizeHtml(withEvent);
      expect(sanitized).not.toContain('onclick');
    });
  });

  describe('sanitizeText', () => {
    it('should remove all HTML tags', () => {
      const html = '<p>Text</p><b>Bold</b>';
      const sanitized = sanitizeText(html);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).toContain('Text');
      expect(sanitized).toContain('Bold');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow http URLs', () => {
      const url = 'http://example.com';
      const sanitized = sanitizeUrl(url);
      expect(sanitized).toBe(url);
    });

    it('should allow https URLs', () => {
      const url = 'https://example.com';
      const sanitized = sanitizeUrl(url);
      expect(sanitized).toBe(url);
    });

    it('should allow mailto URLs', () => {
      const url = 'mailto:test@example.com';
      const sanitized = sanitizeUrl(url);
      expect(sanitized).toBe(url);
    });

    it('should reject javascript URLs', () => {
      const url = 'javascript:alert(1)';
      const sanitized = sanitizeUrl(url);
      expect(sanitized).toBe('');
    });

    it('should reject data URLs', () => {
      const url = 'data:text/html,<script>alert(1)</script>';
      const sanitized = sanitizeUrl(url);
      expect(sanitized).toBe('');
    });
  });

  describe('sanitizeAttribute', () => {
    it('should remove HTML from attribute values', () => {
      const value = '<script>alert(1)</script>';
      const sanitized = sanitizeAttribute(value);
      expect(sanitized).not.toContain('<script>');
    });
  });
});
