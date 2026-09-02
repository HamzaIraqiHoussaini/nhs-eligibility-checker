import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, fetchUserProfile } from '../lib/supabase';
import type { Profile, UserRole } from '../types/nhs';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isLeadership: boolean;
  isSupervisor: boolean;
  isMember: boolean;
  isRestricted: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadProfile = async (currentUser: User) => {
    try {
      const p = await fetchUserProfile(currentUser.id, currentUser.email || '');
      setProfile(p);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const refreshProfile = async () => {
    // Use the live session user rather than potentially-stale state
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      setUser(currentUser);
      await loadProfile(currentUser);
    } else if (user) {
      await loadProfile(user);
    }
  };

  useEffect(() => {
    // Initial session retrieval
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const role = profile?.role ?? (user?.email?.toLowerCase() === 'hiraqihoussaini@cas.ac.ma' ? 'leadership' : null);
  const isLeadership = role === 'leadership';
  const isSupervisor = role === 'supervisor';
  const isMember = role === 'member';
  const isRestricted = Boolean(profile?.is_restricted);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isLeadership,
        isSupervisor,
        isMember,
        isRestricted,
        loading,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
