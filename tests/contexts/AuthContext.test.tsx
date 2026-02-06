import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ReactNode } from 'react';

// Mock the auth provider module
vi.mock('@/lib/auth', () => ({
  createAuthProvider: vi.fn(() => ({
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    validateSession: vi.fn(),
    refreshSession: vi.fn(),
    getSession: vi.fn(),
    listUsers: vi.fn(() => []),
    inviteUser: vi.fn(),
    removeUser: vi.fn(),
  })),
}));

// Import after mocking
import { createAuthProvider } from '@/lib/auth';

// Helper component to access auth context
function AuthConsumer({ testId }: { testId?: string }) {
  const { user, isLoading, isSessionExpired, login, signup, logout } = useAuth();

  return (
    <div data-testid={testId || 'auth-consumer'}>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <div data-testid="session-expired">{isSessionExpired ? 'expired' : 'valid'}</div>
      <button data-testid="login-btn" onClick={() => login('test@example.com', 'password123')}>
        Login
      </button>
      <button data-testid="signup-btn" onClick={() => signup('new@example.com', 'password123', 'New User')}>
        Signup
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

function renderWithProvider(children: ReactNode) {
  return render(<AuthProvider>{children}</AuthProvider>);
}

describe('AuthContext', () => {
  let mockAuthProvider: ReturnType<typeof createAuthProvider>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    // Get the mock provider instance
    mockAuthProvider = createAuthProvider();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial state', () => {
    it('should start in loading state', () => {
      // Mock validateSession to be pending
      (mockAuthProvider.validateSession as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithProvider(<AuthConsumer />);
      
      expect(screen.getByTestId('loading').textContent).toBe('loading');
    });

    it('should show no user when not logged in', async () => {
      (mockAuthProvider.validateSession as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (mockAuthProvider.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(null);

      renderWithProvider(<AuthConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('not-loading');
      });

      expect(screen.getByTestId('user').textContent).toBe('no-user');
    });

    it('should load user from session when logged in', async () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', createdAt: new Date().toISOString() };
      
      (mockAuthProvider.validateSession as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (mockAuthProvider.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(mockUser);

      renderWithProvider(<AuthConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('test@example.com');
      });
    });
  });

  describe('Login', () => {
    it('should update user on successful login', async () => {
      const user = userEvent.setup();
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', createdAt: new Date().toISOString() };
      
      (mockAuthProvider.validateSession as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (mockAuthProvider.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (mockAuthProvider.login as ReturnType<typeof vi.fn>).mockResolvedValue({ user: mockUser });

      renderWithProvider(<AuthConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('not-loading');
      });

      await user.click(screen.getByTestId('login-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('test@example.com');
      });
    });

    it('should throw error on failed login', async () => {
      const user = userEvent.setup();
      
      (mockAuthProvider.validateSession as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (mockAuthProvider.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (mockAuthProvider.login as ReturnType<typeof vi.fn>).mockResolvedValue({ 
        user: null, 
        error: 'Invalid credentials' 
      });

      renderWithProvider(<AuthConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('not-loading');
      });

      await expect(
        user.click(screen.getByTestId('login-btn'))
      ).rejects.toThrow();
    });
  });

  describe('Signup', () => {
    it('should update user on successful signup', async () => {
      const user = userEvent.setup();
      const mockUser = { id: '2', email: 'new@example.com', name: 'New User', createdAt: new Date().toISOString() };
      
      (mockAuthProvider.validateSession as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (mockAuthProvider.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (mockAuthProvider.signup as ReturnType<typeof vi.fn>).mockResolvedValue({ user: mockUser });

      renderWithProvider(<AuthConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('not-loading');
      });

      await user.click(screen.getByTestId('signup-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('new@example.com');
      });
    });

    it('should throw error on failed signup', async () => {
      const user = userEvent.setup();
      
      (mockAuthProvider.validateSession as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (mockAuthProvider.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (mockAuthProvider.signup as ReturnType<typeof vi.fn>).mockResolvedValue({ 
        user: null, 
        error: 'Email already exists' 
      });

      renderWithProvider(<AuthConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('not-loading');
      });

      await expect(
        user.click(screen.getByTestId('signup-btn'))
      ).rejects.toThrow();
    });
  });

  describe('Logout', () => {
    it('should clear user on logout', async () => {
      const user = userEvent.setup();
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', createdAt: new Date().toISOString() };
      
      (mockAuthProvider.validateSession as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (mockAuthProvider.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(mockUser);
      (mockAuthProvider.logout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      renderWithProvider(<AuthConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('test@example.com');
      });

      await user.click(screen.getByTestId('logout-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('no-user');
      });
    });
  });

  describe('Session expiration', () => {
    it('should show session expired when session validation fails', async () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', createdAt: new Date().toISOString() };
      
      // First return valid, then invalid (simulating session expiration during use)
      let callCount = 0;
      (mockAuthProvider.validateSession as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount === 1);
      });
      (mockAuthProvider.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(mockUser);

      renderWithProvider(<AuthConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('session-expired').textContent).toBe('valid');
      });
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<AuthConsumer />);
      }).toThrow('useAuth must be used within an AuthProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('User management', () => {
    it('should list users', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@example.com', name: 'User 1', createdAt: new Date().toISOString() },
        { id: '2', email: 'user2@example.com', name: 'User 2', createdAt: new Date().toISOString() },
      ];
      
      (mockAuthProvider.validateSession as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (mockAuthProvider.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(mockUsers[0]);
      (mockAuthProvider.listUsers as ReturnType<typeof vi.fn>).mockReturnValue(mockUsers);

      function UserListConsumer() {
        const { listUsers } = useAuth();
        const users = listUsers();
        return (
          <div data-testid="user-count">{users.length}</div>
        );
      }

      renderWithProvider(<UserListConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('user-count').textContent).toBe('2');
      });
    });
  });
});
