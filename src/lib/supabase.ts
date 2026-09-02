import { createClient } from '@supabase/supabase-js';
import type { Profile, UserRole } from '../types/nhs';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ipnbekxtachtodskthqg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_jTVmMOPOcHz6roXB-pz3vA_zg2RBKND';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('[CAS NHS] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set in environment — using hardcoded fallbacks.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Validates if an email is authorized on the CAS NHS Allowlist
 */
export async function checkEmailAllowlist(email: string): Promise<{
  allowed: boolean;
  role?: UserRole;
  fullName?: string;
  error?: string;
}> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    
    // Always permit the primary Super Admin
    if (cleanEmail === 'hiraqihoussaini@cas.ac.ma') {
      return { allowed: true, role: 'leadership', fullName: 'Hamza Iraqi Houssaini' };
    }

    const { data, error } = await supabase
      .from('allowlist')
      .select('email, role, full_name')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (error) {
      // SECURITY: Fail closed — a DB error must NEVER grant access.
      // Previously the code permitted all @cas.ac.ma emails on DB error (fail-open).
      // That was an unintended bypass — now we always deny on error.
      console.error('Allowlist query error (access denied for safety):', error.message);
      return { allowed: false, error: 'Could not verify authorization — please try again or contact leadership.' };
    }

    if (!data) {
      return {
        allowed: false,
        error: 'This email is not on the active CAS NHS member allowlist. Contact Chapter Leadership to be added.',
      };
    }

    return { allowed: true, role: data.role as UserRole, fullName: data.full_name || undefined };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error verifying allowlist.';
    return { allowed: false, error: message };
  }
}

/**
 * Fetch profile with automatic fallback creation if missing
 */
export async function fetchUserProfile(userId: string, userEmail: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  if (!data) {
    // If trigger didn't run, create default profile
    const role: UserRole = userEmail.toLowerCase() === 'hiraqihoussaini@cas.ac.ma' ? 'leadership' : 'member';
    const newProfile: Partial<Profile> = {
      id: userId,
      email: userEmail,
      full_name: userEmail.split('@')[0],
      grade_level: 11,
      role,
      is_on_probation: false,
      probation_count: 0,
      is_restricted: false,
    };

    const { data: created, error: insertError } = await supabase
      .from('profiles')
      .upsert(newProfile)
      .select()
      .single();

    if (insertError) {
      console.error('Error auto-creating profile:', insertError);
      return newProfile as Profile;
    }
    return created as Profile;
  }

  return data as Profile;
}
