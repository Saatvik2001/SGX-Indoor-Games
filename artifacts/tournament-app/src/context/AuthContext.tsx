import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username?: string, password?: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('tournament_auth');
      const session = sessionStorage.getItem('tournament_auth');
      return local === 'true' || session === 'true';
    }
    return false;
  });

  const login = (username?: string, password?: string) => {
    // If no credentials provided, allow 1-click admin login
    if (!username && !password) {
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('tournament_auth', 'true');
        sessionStorage.setItem('tournament_auth', 'true');
      }
      return true;
    }

    if ((username === 'admin' || username === 'solugenix') && (password === 'admin123' || password === 'sgx2026' || !password)) {
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('tournament_auth', 'true');
        sessionStorage.setItem('tournament_auth', 'true');
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tournament_auth');
      sessionStorage.removeItem('tournament_auth');
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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
