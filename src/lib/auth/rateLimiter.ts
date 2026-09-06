/**
 * Client-side rate limiter for login attempts
 * Uses IndexedDB for persistence across sessions
 */

interface LoginAttempt {
  email: string;
  attempts: number;
  lastAttempt: number;
  lockedUntil?: number;
}

// The database holding login attempt counts. Separate from the application
// data store on purpose: a lockout must survive the user clearing their
// inventory, and must not travel in a backup.
const DB_NAME = 'brassworth';
const DB_VERSION = 1;
const STORE_NAME = 'login-attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATIONS = [60000, 300000, 900000, 3600000]; // 1min, 5min, 15min, 1hr

/**
 * Initialize IndexedDB for storing login attempts
 */
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'email' });
        store.createIndex('lastAttempt', 'lastAttempt', { unique: false });
      }
    };
  });
}

/**
 * Get login attempts for an email
 */
async function getLoginAttempts(email: string): Promise<LoginAttempt | null> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(email);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (error) {
    // If IndexedDB fails, fall back to localStorage
    const stored = localStorage.getItem(`login-attempts-${email}`);
    return stored ? JSON.parse(stored) : null;
  }
}

/**
 * Save login attempts for an email
 */
async function saveLoginAttempts(attempt: LoginAttempt): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(attempt);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    // If IndexedDB fails, fall back to localStorage
    localStorage.setItem(`login-attempts-${attempt.email}`, JSON.stringify(attempt));
  }
}

/**
 * Record a failed login attempt
 */
export async function recordFailedAttempt(email: string): Promise<{
  isLocked: boolean;
  remainingAttempts: number;
  lockedUntil?: number;
}> {
  const attempt = await getLoginAttempts(email);
  const now = Date.now();

  let attempts = 1;
  let lockedUntil: number | undefined;

  if (attempt) {
    // Reset attempts if last attempt was more than 1 hour ago
    if (now - attempt.lastAttempt > 3600000) {
      attempts = 1;
    } else {
      attempts = attempt.attempts + 1;
    }

    // Calculate lockout if max attempts reached
    if (attempts >= MAX_ATTEMPTS) {
      const lockoutIndex = Math.min(attempts - MAX_ATTEMPTS, LOCKOUT_DURATIONS.length - 1);
      // Clamped above, so this is always in range; the fallback is the longest
      // lockout rather than a crash if the table is ever changed.
      lockedUntil = now + (LOCKOUT_DURATIONS[lockoutIndex] ?? LOCKOUT_DURATIONS.at(-1) ?? 0);
    }
  }

  await saveLoginAttempts({
    email,
    attempts,
    lastAttempt: now,
    lockedUntil,
  });

  return {
    isLocked: attempts >= MAX_ATTEMPTS,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - attempts),
    lockedUntil,
  };
}

/**
 * Record a successful login and clear attempts
 */
export async function recordSuccessfulLogin(email: string): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(email);
  } catch (error) {
    // Fall back to localStorage
    localStorage.removeItem(`login-attempts-${email}`);
  }
}

/**
 * Check if an email is currently locked
 */
export async function isLocked(email: string): Promise<{
  isLocked: boolean;
  lockedUntil?: number;
  minutesRemaining?: number;
}> {
  const attempt = await getLoginAttempts(email);

  if (!attempt || !attempt.lockedUntil) {
    return { isLocked: false };
  }

  const now = Date.now();
  if (now >= attempt.lockedUntil) {
    // Lockout expired, clear it
    await recordSuccessfulLogin(email);
    return { isLocked: false };
  }

  const minutesRemaining = Math.ceil((attempt.lockedUntil - now) / 60000);

  return {
    isLocked: true,
    lockedUntil: attempt.lockedUntil,
    minutesRemaining,
  };
}

/**
 * Get remaining attempts for an email
 */
export async function getRemainingAttempts(email: string): Promise<number> {
  const attempt = await getLoginAttempts(email);
  if (!attempt) {
    return MAX_ATTEMPTS;
  }

  const now = Date.now();
  // Reset if last attempt was more than 1 hour ago
  if (now - attempt.lastAttempt > 3600000) {
    return MAX_ATTEMPTS;
  }

  return Math.max(0, MAX_ATTEMPTS - attempt.attempts);
}
