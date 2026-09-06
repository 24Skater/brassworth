/**
 * The address a printed label carries.
 *
 * A label encodes a full URL rather than a bare identifier, so a phone's own
 * camera app opens the item with nothing installed. That makes the parser a
 * trust boundary: a scanned code is text an attacker can print and leave
 * somewhere, and following it without checking the origin is an open redirect.
 */

/** The absolute address of an item's page. */
export function itemUrl(itemId: string, origin: string): string {
  return `${origin.replace(/\/$/, '')}/items/${encodeURIComponent(itemId)}`;
}

/**
 * The item id inside a scanned URL, or null when the text is anything else.
 * Only this origin is accepted; a code pointing anywhere else is refused
 * rather than followed.
 */
export function parseItemUrl(text: string, origin: string): string | null {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }

  let here: URL;
  try {
    here = new URL(origin);
  } catch {
    return null;
  }

  if (url.origin !== here.origin) return null;

  const match = /^\/items\/([^/]+)\/?$/.exec(url.pathname);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1] as string);
  } catch {
    return null;
  }
}
