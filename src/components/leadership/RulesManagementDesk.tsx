import React, { useState, useEffect } from 'react';
import {
  Scale,
  AlertTriangle,
  Award,
  Clock,
  Save,
  RotateCcw,
  Sliders,
  Info,
  Users,
  BookOpen,
  Check,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  FileText,
} from 'lucide-react';
import { useChapterRules, DEFAULT_CHAPTER_RULES } from '../../hooks/useChapterRules';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import type { ChapterRulesConfig, CustomRuleSection } from '../../types/nhs';

export const RulesManagementDesk: React.FC = () => {
  const { user } = useAuth();
  const { confirm, alert } = useConfirm();
  const { rules, loading, saving, updateRules } = useChapterRules();

  // Local editable form state
  const [formData, setFormData] = useState<ChapterRulesConfig>(rules);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!loading && rules) {
      setFormData(rules);
      setHasChanges(false);
    }
  }, [loading, rules]);

  const handleChange = <K extends keyof ChapterRulesConfig>(key: K, value: ChapterRulesConfig[K]) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value };
      setHasChanges(true);
      return updated;
    });
  };

  const handleAddSection = () => {
    const currentSections = formData.custom_sections || [];
    const newSection: CustomRuleSection = {
      id: `sec_${Date.now()}`,
      title: `Rule Section ${6 + currentSections.length + 1}`,
      content: '',
    };
    handleChange('custom_sections', [...currentSections, newSection]);
  };

  const handleUpdateSection = (id: string, field: 'title' | 'content', value: string) => {
    const updated = (formData.custom_sections || []).map((sec) =>
      sec.id === id ? { ...sec, [field]: value } : sec
    );
    handleChange('custom_sections', updated);
  };

  const handleDeleteSection = async (id: string, title: string) => {
    const confirmed = await confirm({
      title: 'Delete Rule Section',
      message: `Are you sure you want to remove "${title || 'this section'}"? This section will no longer appear on the Chapter Rules page upon saving.`,
      confirmText: 'Delete Section',
      variant: 'danger',
    });
    if (!confirmed) return;

    const updated = (formData.custom_sections || []).filter((sec) => sec.id !== id);
    handleChange('custom_sections', updated);
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const list = [...(formData.custom_sections || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    handleChange('custom_sections', list);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const confirmed = await confirm({
      title: 'Save Chapter Rules & Quotas',
      message: 'Are you sure you want to update the chapter rules and participation quotas? This will immediately apply to all member dashboards, eligibility audits, and chapter rules pages.',
      confirmText: 'Save Rules & Quotas',
      variant: 'success',
    });

    if (!confirmed) return;

    const result = await updateRules(formData, user?.id);
    if (result.success) {
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
      await alert({
        title: 'Rules Updated Successfully',
        message: 'The chapter rules, bylaws, and participation quotas have been updated in the portal.',
        variant: 'success',
      });
    } else {
      await alert({
        title: 'Update Failed',
        message: result.error || 'Failed to save chapter rules. Please try again.',
        variant: 'danger',
      });
    }
  };

  const handleRestoreDefaults = async () => {
    const confirmed = await confirm({
      title: 'Restore Chapter Defaults',
      message: 'Reset all participation quotas and rules text back to the default Casablanca American School chapter constitution? Any custom amendments will be reverted.',
      confirmText: 'Restore Defaults',
      variant: 'warning',
    });

    if (!confirmed) return;

    setFormData({
      ...DEFAULT_CHAPTER_RULES,
      id: 'current',
    });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)' }}>
          Loading Chapter Rules & Quotas Desk...
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '1.5rem 0 3.5rem' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--color-gold-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            <Scale size={15} /> Governance Desk • Rules & Quotas
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', color: 'var(--color-navy)', margin: 0 }}>
            Rules & Policies Desk
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
            Configure active semester participation quotas (volunteering & projects led) and customize official chapter rules and bylaws.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRestoreDefaults}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', padding: '0.55rem 1rem' }}
            title="Reset form fields to default CAS chapter constitution"
          >
            <RotateCcw size={14} /> Restore Defaults
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={() => handleSave()}
            disabled={saving || !hasChanges}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              padding: '0.55rem 1.25rem',
              opacity: !hasChanges && !saving ? 0.65 : 1,
              cursor: !hasChanges && !saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? (
              <span>Saving...</span>
            ) : saveSuccess ? (
              <>
                <Check size={15} /> Saved
              </>
            ) : (
              <>
                <Save size={15} /> Save Rules & Quotas
              </>
            )}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem', color: '#92400E' }}>
            <AlertTriangle size={16} />
            <span>You have unsaved changes to chapter quotas or rules. Remember to save before navigating away.</span>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleSave()}
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}
          >
            Save Changes
          </button>
        </div>
      )}

      {/* SECTION 1: PARTICIPATION QUOTA CONTROLS */}
      <div className="sharp-card" style={{ padding: '1.75rem', marginBottom: '2rem', borderTop: '4px solid var(--color-oxford)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <Sliders size={20} color="var(--color-oxford)" />
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-navy)', margin: 0 }}>
              Semester Participation Quotas
            </h2>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Set the minimum requirements members must satisfy each semester to maintain Good Standing.
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          
          {/* Card 1: Projects Led Quota */}
          <div style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  Pillar: Leadership & Service
                </span>
                <Award size={16} color="var(--color-gold)" />
              </div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                Projects Led Requirement
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem', lineHeight: 1.45 }}>
                Number of approved chapter projects a member must initiate and lead during the semester.
              </p>
            </div>

            <div style={{ paddingTop: '0.85rem', borderTop: '1px solid var(--color-border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.no_projects_led_required}
                  onChange={(e) => handleChange('no_projects_led_required', e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-oxford)' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: formData.no_projects_led_required ? 'var(--color-oxford)' : 'var(--color-text-primary)' }}>
                  No projects led needed this semester
                </span>
              </label>

              <div style={{ opacity: formData.no_projects_led_required ? 0.45 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <label htmlFor="required_projects_led_input" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Required per semester:
                  </label>
                  <input
                    id="required_projects_led_input"
                    type="number"
                    min="1"
                    max="10"
                    disabled={formData.no_projects_led_required}
                    value={formData.required_projects_led}
                    onChange={(e) => handleChange('required_projects_led', Math.max(1, parseInt(e.target.value, 10) || 1))}
                    style={{
                      width: '75px',
                      padding: '0.4rem 0.6rem',
                      border: '1px solid var(--color-border)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: 'var(--color-navy)',
                    }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>project(s) led</span>
                </div>
              </div>

              {formData.no_projects_led_required ? (
                <div style={{ marginTop: '0.65rem', fontSize: '0.74rem', color: 'var(--color-sage-text)', fontWeight: 600 }}>
                  *All members are granted an automatic pass for the projects led quota.
                </div>
              ) : (
                <div style={{ marginTop: '0.65rem', fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                  *Default chapter rule is 1 project led per semester.
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Volunteering Quota */}
          <div style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  Pillar: Service
                </span>
                <Users size={16} color="var(--color-oxford)" />
              </div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                Volunteering Requirement
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem', lineHeight: 1.45 }}>
                Number of chapter projects or initiatives a member must volunteer in during the semester.
              </p>
            </div>

            <div style={{ paddingTop: '0.85rem', borderTop: '1px solid var(--color-border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.no_volunteering_required}
                  onChange={(e) => handleChange('no_volunteering_required', e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-oxford)' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: formData.no_volunteering_required ? 'var(--color-oxford)' : 'var(--color-text-primary)' }}>
                  No volunteering needed this semester
                </span>
              </label>

              <div style={{ opacity: formData.no_volunteering_required ? 0.45 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <label htmlFor="required_volunteering_input" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Required per semester:
                  </label>
                  <input
                    id="required_volunteering_input"
                    type="number"
                    min="1"
                    max="20"
                    disabled={formData.no_volunteering_required}
                    value={formData.required_volunteering}
                    onChange={(e) => handleChange('required_volunteering', Math.max(1, parseInt(e.target.value, 10) || 1))}
                    style={{
                      width: '75px',
                      padding: '0.4rem 0.6rem',
                      border: '1px solid var(--color-border)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: 'var(--color-navy)',
                    }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>initiative(s)</span>
                </div>
              </div>

              {formData.no_volunteering_required ? (
                <div style={{ marginTop: '0.65rem', fontSize: '0.74rem', color: 'var(--color-sage-text)', fontWeight: 600 }}>
                  *All members are granted an automatic pass for the volunteering quota.
                </div>
              ) : (
                <div style={{ marginTop: '0.65rem', fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                  *Default chapter rule is 2 projects volunteered per semester.
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Semester Proposal Cap */}
          <div style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  Workload Balance
                </span>
                <Clock size={16} color="var(--color-terracotta)" />
              </div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                Semester Proposal Limit Cap
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem', lineHeight: 1.45 }}>
                Maximum number of active project proposals a single member may submit and lead per semester.
              </p>
            </div>

            <div style={{ paddingTop: '0.85rem', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '1.4rem' }}>
                <label htmlFor="max_projects_cap_input" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Cap per semester:
                </label>
                <input
                  id="max_projects_cap_input"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.max_projects_per_semester}
                  onChange={(e) => handleChange('max_projects_per_semester', Math.max(1, parseInt(e.target.value, 10) || 2))}
                  style={{
                    width: '75px',
                    padding: '0.4rem 0.6rem',
                    border: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: 'var(--color-navy)',
                  }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>max projects</span>
              </div>
              <div style={{ marginTop: '0.65rem', fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                *Standard chapter maximum is 2 projects / semester (4 projects / year).
              </div>
            </div>
          </div>

        </div>

        {/* Live Preview Bar */}
        <div style={{ padding: '1rem 1.25rem', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-oxford)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            <Info size={14} /> Member Dashboard Live Preview
          </div>
          <div style={{ fontSize: '0.84rem', color: '#1E3A8A', lineHeight: 1.5 }}>
            With these settings active, members will see:
            <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.25rem' }}>
              <li>
                <strong>Projects Led Quota:</strong> {formData.no_projects_led_required ? 'Waived (No projects led required this term)' : `Must lead at least ${formData.required_projects_led} project(s)`}
              </li>
              <li>
                <strong>Volunteering Quota:</strong> {formData.no_volunteering_required ? 'Waived (No volunteering required this term)' : `Must volunteer in at least ${formData.required_volunteering} initiative(s)`}
              </li>
              {formData.no_projects_led_required && formData.no_volunteering_required && (
                <li style={{ color: 'var(--color-sage-text)', fontWeight: 600 }}>
                  All members automatically satisfy semester participation requirements.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* SECTION 2: OFFICIAL CHAPTER RULES & BYLAWS CUSTOMIZATION */}
      <div className="sharp-card" style={{ padding: '1.75rem', borderTop: '4px solid var(--color-navy)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <BookOpen size={20} color="var(--color-navy)" />
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-navy)', margin: 0 }}>
              Official Chapter Rules & Bylaws Content
            </h2>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Customize and clarify chapter guidelines displayed on the member rules page and candidate screener.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Section: Academic Standards */}
          <div>
            <label htmlFor="academic_rules_summary_input" style={{ display: 'block', fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
              1. Academic Standing & GPA Standards Summary
            </label>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0 0 0.45rem' }}>
              Summarizes Grade 10 vs 11/12 criteria, 4 IB HL candidate exceptions, and conduct mark limits.
            </p>
            <textarea
              id="academic_rules_summary_input"
              rows={3}
              value={formData.academic_rules_summary || ''}
              onChange={(e) => handleChange('academic_rules_summary', e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                border: '1px solid var(--color-border)',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                color: 'var(--color-text-primary)',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Section: Participation & Service */}
          <div>
            <label htmlFor="participation_rules_summary_input" style={{ display: 'block', fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
              2. Participation & Service Expectations
            </label>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0 0 0.45rem' }}>
              Explains project leadership, service-based project requirements, and volunteer obligations.
            </p>
            <textarea
              id="participation_rules_summary_input"
              rows={3}
              value={formData.participation_rules_summary || ''}
              onChange={(e) => handleChange('participation_rules_summary', e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                border: '1px solid var(--color-border)',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                color: 'var(--color-text-primary)',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Section: Probation Rules */}
          <div>
            <label htmlFor="probation_rules_summary_input" style={{ display: 'block', fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
              3. Chapter Probation Triggers
            </label>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0 0 0.45rem' }}>
              Criteria for issuing Chapter Probation (academic deficiency, meeting absences, participation deficits).
            </p>
            <textarea
              id="probation_rules_summary_input"
              rows={3}
              value={formData.probation_rules_summary || ''}
              onChange={(e) => handleChange('probation_rules_summary', e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                border: '1px solid var(--color-border)',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                color: 'var(--color-text-primary)',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Section: Dismissal Rules */}
          <div>
            <label htmlFor="dismissal_rules_summary_input" style={{ display: 'block', fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
              4. Dismissal & Account Restriction Policies
            </label>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0 0 0.45rem' }}>
              Grounds for automatic membership revocation, credential removal, and loss of graduation honors.
            </p>
            <textarea
              id="dismissal_rules_summary_input"
              rows={3}
              value={formData.dismissal_rules_summary || ''}
              onChange={(e) => handleChange('dismissal_rules_summary', e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                border: '1px solid var(--color-border)',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                color: 'var(--color-text-primary)',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Section: Custom Chapter Bylaws */}
          <div style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
            <label htmlFor="custom_bylaws_input" style={{ display: 'block', fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.92rem', marginBottom: '0.35rem' }}>
              5. Additional Chapter Bylaws & Executive Notes
            </label>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: '0 0 0.65rem', lineHeight: 1.45 }}>
              Use this section for special semester directives, chapter amendments, meeting tardiness policies, or specific executive council resolutions. This will be published as an official section on the Chapter Rules page.
            </p>
            <textarea
              id="custom_bylaws_input"
              rows={5}
              placeholder="e.g. 2026 Executive Council Resolution: All project proposals must be submitted at least 14 days prior to event execution date..."
              value={formData.custom_bylaws || ''}
              onChange={(e) => handleChange('custom_bylaws', e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                border: '1px solid var(--color-border)',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                color: 'var(--color-text-primary)',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

        </div>

      </div>

      {/* SECTION 3: DYNAMIC CUSTOM RULE SECTIONS */}
      <div className="sharp-card" style={{ padding: '1.75rem', marginBottom: '2rem', borderTop: '4px solid var(--color-gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Layers size={20} color="var(--color-gold-text)" />
            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-navy)', margin: 0 }}>
                Custom Rule Sections
              </h2>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Add custom numbered sections that will be rendered directly on the official Chapter Rules page.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleAddSection}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.84rem', padding: '0.5rem 1rem' }}
          >
            <Plus size={15} /> Add New Section
          </button>
        </div>

        {(!formData.custom_sections || formData.custom_sections.length === 0) ? (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', border: '2px dashed var(--color-border)', backgroundColor: '#F8FAFC' }}>
            <FileText size={28} color="var(--color-text-muted)" style={{ margin: '0 auto 0.65rem' }} />
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-navy)' }}>No Custom Sections Added Yet</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', maxWidth: '500px', margin: '0.35rem auto 1rem' }}>
              Add custom sections to incorporate policies such as Attendance Demerits, Community Service Partners, Officer Transition Rules, or Graduation Regalia Criteria.
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleAddSection}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem' }}
            >
              <Plus size={14} /> Add First Section
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {formData.custom_sections.map((section, idx) => (
              <div
                key={section.id}
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', paddingBottom: '0.65rem', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="grade-badge" style={{ backgroundColor: '#EFF6FF', color: 'var(--color-oxford)', fontWeight: 700 }}>
                      Section {6 + idx + 1}
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-navy)' }}>
                      {section.title || `Untitled Section ${idx + 1}`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className="btn-inspect"
                      disabled={idx === 0}
                      onClick={() => handleMoveSection(idx, 'up')}
                      title="Move section up"
                      style={{ padding: '0.3rem 0.5rem', opacity: idx === 0 ? 0.35 : 1 }}
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn-inspect"
                      disabled={idx === (formData.custom_sections?.length || 0) - 1}
                      onClick={() => handleMoveSection(idx, 'down')}
                      title="Move section down"
                      style={{ padding: '0.3rem 0.5rem', opacity: idx === (formData.custom_sections?.length || 0) - 1 ? 0.35 : 1 }}
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn-inspect"
                      onClick={() => handleDeleteSection(section.id, section.title)}
                      title="Delete section"
                      style={{ padding: '0.3rem 0.5rem', color: 'var(--color-terracotta)', borderColor: '#FECACA' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
                      Section Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Officer Elections & Executive Board Qualifications"
                      value={section.title}
                      onChange={(e) => handleUpdateSection(section.id, 'title', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--color-navy)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
                      Section Content & Rules Text
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Enter the rules, guidelines, eligibility criteria, or procedures for this section..."
                      value={section.content}
                      onChange={(e) => handleUpdateSection(section.id, 'content', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.75rem',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.85rem',
                        lineHeight: 1.5,
                        color: 'var(--color-text-primary)',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Global Bottom Save Bar */}
      <div className="sharp-card" style={{ padding: '1.25rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#FFFFFF' }}>
        <div>
          {rules.updated_at ? (
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Last saved: {new Date(rules.updated_at).toLocaleString()}
            </span>
          ) : (
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Chapter default constitution active
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRestoreDefaults}
            style={{ fontSize: '0.82rem', padding: '0.55rem 1rem' }}
          >
            <RotateCcw size={14} /> Restore Defaults
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={() => handleSave()}
            disabled={saving || !hasChanges}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              padding: '0.6rem 1.5rem',
              opacity: !hasChanges && !saving ? 0.65 : 1,
              cursor: !hasChanges && !saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save Rules & Quotas'}
          </button>
        </div>
      </div>

    </div>
  );
};
