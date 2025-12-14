import { Progress } from '@/components/ui/progress';
import {
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  validatePasswordStrength,
} from '@/lib/auth/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
  showFeedback?: boolean;
}

export function PasswordStrengthIndicator({
  password,
  showFeedback = true,
}: PasswordStrengthIndicatorProps) {
  if (!password) {
    return null;
  }

  const validation = validatePasswordStrength(password);
  const strengthLabel = getPasswordStrengthLabel(validation.score);
  const strengthColor = getPasswordStrengthColor(validation.score);
  const progressValue = ((validation.score + 1) / 5) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Password strength:</span>
        <span className={strengthColor}>{strengthLabel}</span>
      </div>
      <Progress value={progressValue} className="h-2" />
      {showFeedback && validation.feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {validation.feedback.map((feedback, index) => (
            <li key={index}>• {feedback}</li>
          ))}
        </ul>
      )}
      {validation.warning && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400">{validation.warning}</p>
      )}
    </div>
  );
}
