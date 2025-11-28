import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { storage } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = storage.getUser();
    setUser(storedUser);
    setIsLoading(false);
  }, []);

  const signup = async (email: string, password: string, name: string) => {
    // Simulate signup (in real app, this would be backend)
    const newUser: User = {
      id: crypto.randomUUID(),
      email,
      name,
      createdAt: new Date().toISOString(),
    };
    storage.setUser(newUser);
    setUser(newUser);
  };

  const login = async (email: string, password: string) => {
    // Simulate login (in real app, this would validate with backend)
    const existingUser = storage.getUser();
    if (existingUser && existingUser.email === email) {
      setUser(existingUser);
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const logout = () => {
    storage.setUser(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
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
