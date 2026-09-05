import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordFailedAttempt,
  recordSuccessfulLogin,
  isLocked,
  getRemainingAttempts,
} from '@/lib/auth/rateLimiter';

describe('rateLimiter', () => {
  beforeEach(async () => {
    // Clear IndexedDB for each test
    const dbName = 'home-asset-keeper'; // must match DB_NAME in src/lib/auth/rateLimiter.ts
    const deleteReq = indexedDB.deleteDatabase(dbName);
    await new Promise((resolve, reject) => {
      deleteReq.onsuccess = () => resolve(undefined);
      deleteReq.onerror = () => reject(deleteReq.error);
    });
  });

  describe('recordFailedAttempt', () => {
    it('should record first failed attempt', async () => {
      const result = await recordFailedAttempt('test@example.com');
      expect(result.remainingAttempts).toBeLessThan(5);
      expect(result.isLocked).toBe(false);
    });

    it('should lock after max attempts', async () => {
      const email = 'test@example.com';

      // Record multiple failed attempts
      let result;
      for (let i = 0; i < 6; i++) {
        result = await recordFailedAttempt(email);
      }

      expect(result!.isLocked).toBe(true);
      expect(result!.lockedUntil).toBeDefined();
    });
  });

  describe('recordSuccessfulLogin', () => {
    it('should clear failed attempts', async () => {
      const email = 'test@example.com';

      // Record some failed attempts
      await recordFailedAttempt(email);
      await recordFailedAttempt(email);

      // Successful login should clear attempts
      await recordSuccessfulLogin(email);

      const remaining = await getRemainingAttempts(email);
      expect(remaining).toBe(5); // Reset to max
    });
  });

  describe('isLocked', () => {
    it('should return false for unlocked account', async () => {
      const result = await isLocked('test@example.com');
      expect(result.isLocked).toBe(false);
    });

    it('should return true for locked account', async () => {
      const email = 'test@example.com';

      // Lock the account
      for (let i = 0; i < 6; i++) {
        await recordFailedAttempt(email);
      }

      const result = await isLocked(email);
      expect(result.isLocked).toBe(true);
      expect(result.minutesRemaining).toBeDefined();
    });
  });

  describe('getRemainingAttempts', () => {
    it('should return max attempts for new email', async () => {
      const remaining = await getRemainingAttempts('new@example.com');
      expect(remaining).toBe(5);
    });

    it('should decrease after failed attempts', async () => {
      const email = 'test@example.com';
      await recordFailedAttempt(email);

      const remaining = await getRemainingAttempts(email);
      expect(remaining).toBeLessThan(5);
    });
  });
});
