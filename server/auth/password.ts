import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

/**
 * promisify() collapses scrypt to its three-argument overload and drops the
 * options object, so the cost parameters would be silently ignored. Wrapping it
 * by hand keeps them typed.
 */
function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

/**
 * Password hashing.
 *
 * scrypt from Node's own crypto, not Argon2id as the architecture document
 * originally said. Argon2 is the stronger first choice on paper, but every
 * Node binding for it is a native module, and this project's whole pitch to
 * self-hosters is that running it is easy. scrypt is OWASP's named second
 * choice, is memory-hard, and ships in the standard library — no compiler, no
 * prebuilt-binary roulette on someone's NAS.
 *
 * Parameters follow the OWASP cheat sheet: N=2^17, r=8, p=1.
 *
 * Note that this replaces, and cannot migrate, the browser-side PBKDF2 hashes
 * from the local-only tier. Those were never a server credential. Local
 * accounts re-register.
 */

const N = 2 ** 17;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 32;

// scrypt needs memory roughly 128 * N * r bytes; Node's default cap is lower.
const MAX_MEMORY = 256 * N * R;

const PREFIX = 'scrypt';

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: MAX_MEMORY,
  });

  // Self-describing, so the parameters can change without stranding old hashes.
  return [PREFIX, N, R, P, salt.toString('base64'), derived.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== PREFIX) return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4]!, 'base64');
    expected = Buffer.from(parts[5]!, 'base64');
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  const derived = await scrypt(password.normalize('NFKC'), salt, expected.length, {
    N: n,
    r,
    p,
    maxmem: 256 * n * r,
  });

  // Constant time, so a wrong password cannot be narrowed down by timing.
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** True when a stored hash used weaker parameters than we now require. */
export function needsRehash(stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== PREFIX) return true;
  return Number(parts[1]) < N || Number(parts[2]) < R || Number(parts[3]) < P;
}
