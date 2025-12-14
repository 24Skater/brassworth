import zxcvbn from 'zxcvbn';

export interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0-4 (0=weak, 4=very strong)
  feedback: string[];
  warning?: string;
}

/**
 * Validates password strength using zxcvbn
 * Requirements:
 * - Minimum 12 characters
 * - Score of 3 or higher (strong or very strong)
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  // Minimum length check
  if (password.length < 12) {
    return {
      isValid: false,
      score: 0,
      feedback: ['Password must be at least 12 characters long'],
      warning: 'Password is too short',
    };
  }

  // Use zxcvbn to check password strength
  const result = zxcvbn(password);

  // Require score of 3 or higher (strong or very strong)
  const isValid = result.score >= 3;

  return {
    isValid,
    score: result.score,
    feedback:
      result.feedback.suggestions.length > 0
        ? result.feedback.suggestions
        : isValid
          ? ['Password strength is good']
          : ['Password is too weak. Try adding more characters, numbers, or special characters'],
    warning: result.feedback.warning || undefined,
  };
}

/**
 * Gets a human-readable strength label
 */
export function getPasswordStrengthLabel(score: number): string {
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  return labels[score] || 'Unknown';
}

/**
 * Gets a color for the strength indicator
 */
export function getPasswordStrengthColor(score: number): string {
  const colors = [
    'text-red-500',
    'text-orange-500',
    'text-yellow-500',
    'text-green-500',
    'text-green-600',
  ];
  return colors[score] || 'text-gray-500';
}
