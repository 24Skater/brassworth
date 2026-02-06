import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { createAuthProvider } from '@/lib/auth';

// Session check interval (5 minutes)
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000;

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isSessionExpired: boolean;
  refreshSession: () => Promise<boolean>;
  listUsers: () => User[];
  inviteUser: (email: string, name: string, organizationId: string, role: UserRole) => Promise<void>;
  removeUser: (userId: string, organizationId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const authProvider = createAuthProvider();

  // Check session validity
  const checkSession = useCallback(async () => {
    const isValid = await authProvider.validateSession();
    if (!isValid && user) {
      setUser(null);
      setIsSessionExpired(true);
    }
  }, [user]);

  // Initial session check and periodic validation
  useEffect(() => {
    const initializeAuth = async () => {
      const isValid = await authProvider.validateSession();
      if (isValid) {
        const currentUser = authProvider.getCurrentUser();
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    initializeAuth();

    // Set up periodic session check
    const interval = setInterval(checkSession, SESSION_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkSession]);

  const signup = async (email: string, password: string, name: string) => {
    const result = await authProvider.signup(email, password, name);
    if (result.error) {
      throw new Error(result.error);
    }
    setUser(result.user);
    setIsSessionExpired(false);
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    const result = await authProvider.login(email, password, rememberMe);
    if (result.error) {
      throw new Error(result.error);
    }
    setUser(result.user);
    setIsSessionExpired(false);
  };

  const logout = () => {
    authProvider.logout();
    setUser(null);
    setIsSessionExpired(false);
  };

  const refreshSession = async (): Promise<boolean> => {
    const success = await authProvider.refreshSession();
    if (success) {
      setIsSessionExpired(false);
    }
    return success;
  };

  const listUsers = (): User[] => {
    return authProvider.listUsers();
  };

  const inviteUser = async (email: string, name: string, organizationId: string, role: UserRole) => {
    const result = await authProvider.inviteUser(email, name, organizationId, role);
    if (result.error) {
      throw new Error(result.error);
    }
  };

  const removeUser = async (userId: string, organizationId: string) => {
    const result = await authProvider.removeUser(userId, organizationId);
    if (result.error) {
      throw new Error(result.error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      signup, 
      logout, 
      isLoading,
      isSessionExpired,
      refreshSession,
      listUsers,
      inviteUser,
      removeUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
