import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, fetchUserProfile } from '../lib/supabase';
import type { Profile, UserRole } from '../types/nhs';
import { recordLoginEvent } from '../lib/authTracking';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isLeadership: boolean;
  isSupervisor: boolean;
  isAdministrator: boolean;
  isMember: boolean;
  isRestricted: boolean;
  isGraduated: boolean;
  loading: boolean;
  refreshProfile: (explicitUser?: User) => Promise<Profile | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadProfile = async (currentUser: User): Promise<Profile | null> => {
    try {
      const p = await fetchUserProfile(currentUser.id, currentUser.email || '');
      if (p) {
        setProfile(p);
        return p;
      }
    } catch (err) {
      console.error('[CAS NHS] Failed to load profile from DB:', err);
    }
    return null;
  };

  const refreshProfile = async (explicitUser?: User): Promise<Profile | null> => {
    try {
      const targetUser = explicitUser || user || (await supabase.auth.getUser()).data.user;
      if (targetUser) {
        setUser(targetUser);
        return await loadProfile(targetUser);
      }
    } catch (err) {
      console.warn('[CAS NHS] refreshProfile encountered non-fatal error:', err);
    }
    return null;
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
        if (_event === 'SIGNED_IN') {
          // Record login asynchronously without blocking auth state delivery or UI render
          recordLoginEvent(session.user.id, session.user.email || '').catch((e) =>
            console.warn('[CAS NHS] Background login telemetry non-fatal:', e)
          );
        }
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

  // Multi-tier instant role resolution:
  // 1. Loaded database profile role (authoritative)
  // 2. Auth user raw_user_meta_data role (available on frame 0 upon sign in)
  // 3. Superadmin email fallback
  const userMetadataRole = user?.user_metadata?.role as UserRole | undefined;
  const isSuperadminEmail = user?.email?.toLowerCase() === 'hiraqihoussaini@cas.ac.ma';

  const role: UserRole | null =
    profile?.role ??
    userMetadataRole ??
    (isSuperadminEmail ? 'leadership' : null);

  const isLeadership = role === 'leadership';
  const isSupervisor = role === 'supervisor';
  const isAdministrator = role === 'administrator';
  const isMember = role === 'member';

  // Instant provisional profile synthesis on frame 0:
  // If the database query is still in flight across the network, immediately construct
  // an accurate profile from auth metadata so there is NEVER a flash of "Member" or missing permissions.
  const effectiveProfile: Profile | null = profile || (user ? {
    id: user.id,
    email: user.email || '',
    full_name: (user.user_metadata?.full_name as string) ||
               (user.user_metadata?.first_name ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim() : (isSuperadminEmail ? 'Hamza Iraqi Houssaini' : user.email?.split('@')[0] || 'Member')),
    role: role || 'member',
    grade_level: (role === 'supervisor' || role === 'administrator') ? null : 11,
    is_on_probation: false,
    probation_count: 0,
    probation_reason: null,
    probation_notes: null,
    probation_updated_at: null,
    is_restricted: false,
    restricted_reason: null,
    created_at: user.created_at || new Date().toISOString(),
  } : null);

  const isRestricted = Boolean(effectiveProfile?.is_restricted || effectiveProfile?.role === 'kicked_out');
  const isGraduated = Boolean(effectiveProfile?.role === 'graduate' || effectiveProfile?.role === 'past_leadership' || effectiveProfile?.role === 'past_member');

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile: effectiveProfile,
        role,
        isLeadership,
        isSupervisor,
        isAdministrator,
        isMember,
        isRestricted,
        isGraduated,
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
