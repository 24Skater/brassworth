import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Only allows safe HTML tags and attributes
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitizes plain text by removing all HTML tags
 * Use this for user input that should be displayed as plain text
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

/**
 * Sanitizes a URL to prevent XSS and malicious redirects
 * Only allows http, https, and mailto protocols
 */
export function sanitizeUrl(url: string): string {
  const sanitized = DOMPurify.sanitize(url, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

  // Check if it's a valid URL with allowed protocol
  try {
    const parsed = new URL(sanitized);
    const allowedProtocols = ['http:', 'https:', 'mailto:'];
    if (allowedProtocols.includes(parsed.protocol)) {
      return sanitized;
    }
    return '';
  } catch {
    // Not a valid URL, return empty string
    return '';
  }
}

/**
 * Sanitizes user input for use in HTML attributes
 */
export function sanitizeAttribute(value: string): string {
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
