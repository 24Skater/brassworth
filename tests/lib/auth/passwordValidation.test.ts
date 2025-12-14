import { describe, it, expect } from 'vitest';
import {
  validatePasswordStrength,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
} from '@/lib/auth/passwordValidation';

describe('passwordValidation', () => {
  describe('validatePasswordStrength', () => {
    it('should reject passwords shorter than 12 characters', () => {
      const result = validatePasswordStrength('short');
      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('at least 12 characters');
    });

    it('should accept strong passwords', () => {
      const result = validatePasswordStrength('ThisIsAVeryStrongPassword123!@#');
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    it('should provide feedback for weak passwords', () => {
      const result = validatePasswordStrength('password12345');
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should return score between 0 and 4', () => {
      const result = validatePasswordStrength('TestPassword123!@#');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(4);
    });
  });

  describe('getPasswordStrengthLabel', () => {
    it('should return correct label for each score', () => {
      expect(getPasswordStrengthLabel(0)).toBe('Very Weak');
      expect(getPasswordStrengthLabel(1)).toBe('Weak');
      expect(getPasswordStrengthLabel(2)).toBe('Fair');
      expect(getPasswordStrengthLabel(3)).toBe('Strong');
      expect(getPasswordStrengthLabel(4)).toBe('Very Strong');
    });
  });

  describe('getPasswordStrengthColor', () => {
    it('should return correct color for each score', () => {
      expect(getPasswordStrengthColor(0)).toBe('text-red-500');
      expect(getPasswordStrengthColor(1)).toBe('text-orange-500');
      expect(getPasswordStrengthColor(2)).toBe('text-yellow-500');
      expect(getPasswordStrengthColor(3)).toBe('text-green-500');
      expect(getPasswordStrengthColor(4)).toBe('text-green-600');
    });
  });
});
