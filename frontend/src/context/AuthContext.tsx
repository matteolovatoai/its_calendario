'use client';

import React, { createContext, useContext } from 'react';
import { useSession, signOut } from 'next-auth/react';

interface AuthUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
}

interface AuthContextType {
  token: string | null;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  role: string | null;
  user: AuthUser | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const logout = () => {
    signOut();
  };

  const user = session?.user as AuthUser | undefined;
  const role = user?.role || null;
  const isAdmin = role === 'admin';
  const token =
    (session as unknown as { accessToken?: string })?.accessToken || null;

  return (
    <AuthContext.Provider
      value={{
        token,
        logout,
        isAuthenticated: status === 'authenticated',
        isAdmin,
        role,
        user: user || null,
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
