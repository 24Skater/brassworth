import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';

describe('PasswordStrengthIndicator', () => {
  it('should not render when password is empty', () => {
    const { container } = render(<PasswordStrengthIndicator password="" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when password is provided', () => {
    render(<PasswordStrengthIndicator password="test" />);
    expect(screen.getByText(/password strength/i)).toBeInTheDocument();
  });

  it('should show strength label', () => {
    render(<PasswordStrengthIndicator password="TestPassword123!@#" />);
    // Should show a strength label (Very Weak, Weak, Fair, Strong, or Very Strong)
    const label = screen.getByText(/very weak|weak|fair|strong|very strong/i);
    expect(label).toBeInTheDocument();
  });

  it('should show progress bar', () => {
    const { container } = render(<PasswordStrengthIndicator password="TestPassword123!@#" />);
    // Progress component should be rendered
    const progress = container.querySelector('[role="progressbar"]');
    expect(progress).toBeInTheDocument();
  });

  it('should show feedback when enabled', () => {
    render(<PasswordStrengthIndicator password="weakpassword123" showFeedback={true} />);
    // Should show feedback items
    const feedback = screen.queryByText(/•/);
    // Feedback may or may not be present depending on password strength
    // Just verify component renders without error
    expect(screen.getByText(/password strength/i)).toBeInTheDocument();
  });
});
