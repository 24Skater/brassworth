import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { createAuthProvider } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  listUsers: () => User[];
  inviteUser: (email: string, name: string, organizationId: string, role: UserRole) => Promise<void>;
  removeUser: (userId: string, organizationId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authProvider = createAuthProvider();

  useEffect(() => {
    const currentUser = authProvider.getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  const signup = async (email: string, password: string, name: string) => {
    const result = await authProvider.signup(email, password, name);
    if (result.error) {
      throw new Error(result.error);
    }
    setUser(result.user);
  };

  const login = async (email: string, password: string) => {
    const result = await authProvider.login(email, password);
    if (result.error) {
      throw new Error(result.error);
    }
    setUser(result.user);
  };

  const logout = () => {
    authProvider.logout();
    setUser(null);
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
