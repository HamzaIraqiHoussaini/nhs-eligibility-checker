import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ChapterRulesConfig } from '../types/nhs';

export const DEFAULT_CHAPTER_RULES: ChapterRulesConfig = {
  id: 'current',
  required_volunteering: 2,
  no_volunteering_required: false,
  required_projects_led: 1,
  no_projects_led_required: false,
  max_projects_per_semester: 2,
  academic_rules_summary: 'Grade 10: 5.80+ average across academic courses (excluding PE & Design Tech). Grade 11-12: 5.80+ average across assessed IB courses (5.60+ for 4 IB HL candidates). Conduct: Zero Approaching Expectations (AE) or Beginning Expectations (BE) marks.',
  participation_rules_summary: 'Members are required to lead approved projects and volunteer in chapter initiatives per semester according to active quotas. At least one project per year must be service-based.',
  probation_rules_summary: 'Probation is triggered by: academic deficiency below GPA standards; conduct flags (AE/BE in more than 1 course); unexcused meeting absences (2 absences); or semester participation deficit.',
  dismissal_rules_summary: 'Grounds for immediate dismissal and restricted account status: incurring multiple probations (more than once); major code of conduct or academic integrity violations (cheating, plagiarism, substance possession).',
  custom_bylaws: '',
  custom_sections: [],
};

export const useChapterRules = () => {
  const [rules, setRules] = useState<ChapterRulesConfig>(DEFAULT_CHAPTER_RULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchErr } = await supabase
        .from('chapter_rules')
        .select('*')
        .eq('id', 'current')
        .maybeSingle();

      if (fetchErr) {
        console.error('Failed to load chapter rules:', fetchErr);
        setError(fetchErr.message);
      } else if (data) {
        setRules({
          id: data.id || 'current',
          required_volunteering: Number(data.required_volunteering ?? 2),
          no_volunteering_required: Boolean(data.no_volunteering_required),
          required_projects_led: Number(data.required_projects_led ?? 1),
          no_projects_led_required: Boolean(data.no_projects_led_required),
          max_projects_per_semester: Number(data.max_projects_per_semester ?? 2),
          academic_rules_summary: data.academic_rules_summary ?? DEFAULT_CHAPTER_RULES.academic_rules_summary,
          participation_rules_summary: data.participation_rules_summary ?? DEFAULT_CHAPTER_RULES.participation_rules_summary,
          probation_rules_summary: data.probation_rules_summary ?? DEFAULT_CHAPTER_RULES.probation_rules_summary,
          dismissal_rules_summary: data.dismissal_rules_summary ?? DEFAULT_CHAPTER_RULES.dismissal_rules_summary,
          custom_bylaws: data.custom_bylaws ?? '',
          custom_sections: Array.isArray(data.custom_sections) ? data.custom_sections : [],
          updated_by: data.updated_by,
          updated_at: data.updated_at,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error loading rules';
      console.error('Unexpected error loading chapter rules:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const updateRules = async (newConfig: Partial<ChapterRulesConfig>, updatedByUserId?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        ...newConfig,
        id: 'current',
        updated_by: updatedByUserId || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateErr } = await supabase
        .from('chapter_rules')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (updateErr) {
        console.error('Failed to update chapter rules:', updateErr);
        setError(updateErr.message);
        return { success: false, error: updateErr.message };
      }

      if (data) {
        setRules((prev) => ({
          ...prev,
          ...data,
          required_volunteering: Number(data.required_volunteering ?? prev.required_volunteering),
          no_volunteering_required: Boolean(data.no_volunteering_required),
          required_projects_led: Number(data.required_projects_led ?? prev.required_projects_led),
          no_projects_led_required: Boolean(data.no_projects_led_required),
          max_projects_per_semester: Number(data.max_projects_per_semester ?? prev.max_projects_per_semester),
        }));
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error saving rules';
      console.error('Unexpected error saving chapter rules:', err);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSaving(false);
    }
  };

  return {
    rules,
    loading,
    saving,
    error,
    reloadRules: loadRules,
    updateRules,
  };
};
