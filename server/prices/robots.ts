/**
 * robots.txt, honoured.
 *
 * A price check is an automated request to somebody else's server. Reading
 * their robots.txt first and obeying it is the minimum courtesy, and it is
 * cheap: one cached fetch per host.
 *
 * Deliberately conservative. When robots.txt cannot be understood, the answer
 * is "do not fetch" rather than "assume permission".
 */

export interface RobotsRules {
  /** Path prefixes disallowed for us, longest first. */
  disallow: string[];
  /** Path prefixes explicitly allowed, which override a longer disallow. */
  allow: string[];
  /** Seconds the host asked callers to wait between requests. */
  crawlDelaySeconds?: number;
}

export const USER_AGENT = 'BrassworthPriceWatch';

/**
 * Parse the groups that apply to us: our own agent if named, otherwise `*`.
 *
 * A specific group wins outright — a host that names us has said something
 * more precise than its wildcard, and merging the two would dilute it.
 */
export function parseRobots(text: string, userAgent = USER_AGENT): RobotsRules {
  const wildcard: RobotsRules = { disallow: [], allow: [] };
  const specific: RobotsRules = { disallow: [], allow: [] };

  let appliesToWildcard = false;
  let appliesToSpecific = false;
  let inGroup = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split('#')[0]?.trim() ?? '';
    if (!line) continue;

    const separator = line.indexOf(':');
    if (separator === -1) continue;

    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === 'user-agent') {
      // A new agent line after directives starts a fresh group.
      if (inGroup) {
        appliesToWildcard = false;
        appliesToSpecific = false;
        inGroup = false;
      }
      if (value === '*') appliesToWildcard = true;
      if (value.toLowerCase() === userAgent.toLowerCase()) appliesToSpecific = true;
      continue;
    }

    inGroup = true;
    const targets = [
      ...(appliesToWildcard ? [wildcard] : []),
      ...(appliesToSpecific ? [specific] : []),
    ];
    if (targets.length === 0) continue;

    for (const rules of targets) {
      if (field === 'disallow' && value) rules.disallow.push(value);
      else if (field === 'allow' && value) rules.allow.push(value);
      else if (field === 'crawl-delay') {
        const delay = Number.parseFloat(value);
        if (Number.isFinite(delay) && delay >= 0) rules.crawlDelaySeconds = delay;
      }
    }
  }

  const chosen =
    specific.disallow.length || specific.allow.length || specific.crawlDelaySeconds !== undefined
      ? specific
      : wildcard;

  return {
    disallow: [...chosen.disallow].sort((a, b) => b.length - a.length),
    allow: [...chosen.allow].sort((a, b) => b.length - a.length),
    crawlDelaySeconds: chosen.crawlDelaySeconds,
  };
}

/**
 * Whether a path may be fetched.
 *
 * The longest matching rule wins, and an equally long allow beats a disallow,
 * which is how the de facto standard behaves.
 */
export function isAllowed(rules: RobotsRules, path: string): boolean {
  const longestAllow = rules.allow.find((prefix) => path.startsWith(prefix))?.length ?? -1;
  const longestDisallow = rules.disallow.find((prefix) => path.startsWith(prefix))?.length ?? -1;

  if (longestDisallow === -1) return true;
  return longestAllow >= longestDisallow;
}

/** `Disallow: /` blocks everything. */
export function blocksEverything(rules: RobotsRules): boolean {
  return !isAllowed(rules, '/');
}
