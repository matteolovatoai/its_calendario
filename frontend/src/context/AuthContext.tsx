'use client';

import React, { createContext, useContext } from 'react';
import { useSession, signOut } from 'next-auth/react';

interface AuthUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface AuthContextType {
  token: string | null;
  logout: () => void;
  isAuthenticated: boolean;
  user: AuthUser | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const logout = () => {
    signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        token: null,
        logout,
        isAuthenticated: status === 'authenticated',
        user: session?.user || null,
      }}
    >
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
