import { BookOpen, ShieldAlert, GraduationCap, AlertTriangle, XCircle } from 'lucide-react';

export const ChapterRules: React.FC = () => {
  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-gold-text)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
          <BookOpen size={16} /> Official Chapter Governance & Constitution
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-navy)', margin: 0 }}>
          CAS National Honor Society Bylaws & Standards
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginTop: '0.35rem' }}>
          Official eligibility prerequisites, grading formulas, probation mechanisms, and dismissal criteria for the Casablanca American School Chapter.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Section 1: Eligibility Prerequisites */}
        <div className="sharp-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <GraduationCap size={22} color="var(--color-oxford)" />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-navy)', margin: 0 }}>
              Eligibility to Apply to NHS
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.88rem', color: 'var(--color-text-primary)' }}>
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#EFF6FF', borderLeft: '3px solid var(--color-oxford)' }}>
              <strong>Eligible Grade Levels:</strong> Must be currently enrolled in <strong>Grade 10, 11, or 12</strong>.
              <br />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                *Note: Semester 2 of Grade 11 is the final opportunity for initial student eligibility and induction consideration.
              </span>
            </div>

            {/* Grade 10 Criteria */}
            <div style={{ border: '1px solid var(--color-border)', padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '1rem', marginBottom: '0.5rem' }}>
                Grade 10 Applicant Standard
              </div>
              <ul style={{ paddingLeft: '1.25rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li>
                  Must achieve a cumulative average of <strong>5.80 or above</strong> in academic courses:
                  <em> English, Art, World Language (French, Spanish, Arabic), Integrated Science, Math, Social Science</em>.
                </li>
                <li style={{ color: 'var(--color-text-muted)' }}>
                  <strong>Exclusion Notice:</strong> Grades in Physical Education (PE) and Design Technology are strictly <strong>not counted</strong> toward the NHS grade average.
                </li>
                <li>
                  <strong>Conduct & Effort:</strong> Absolutely zero <em>Approaching Expectations (AE)</em> or <em>Beginning Expectations (BE)</em> marks on report cards.
                </li>
              </ul>
            </div>

            {/* Grade 11 & 12 Criteria */}
            <div style={{ border: '1px solid var(--color-border)', padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '1rem', marginBottom: '0.5rem' }}>
                Grade 11 & 12 Applicant Standard
              </div>
              <ul style={{ paddingLeft: '1.25rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li>
                  Must achieve an average of <strong>5.80 or above</strong> across assessed IB courses.
                </li>
                <li style={{ backgroundColor: '#FEF3C7', padding: '0.4rem 0.6rem', borderLeft: '3px solid var(--color-gold)' }}>
                  <strong>4 IB HL Exception:</strong> If a student is taking <strong>4 IB Higher Level (HL)</strong> classes, the required minimum GPA threshold is reduced to <strong>5.60</strong>.
                </li>
                <li>
                  Zero <em>Approaching Expectations (AE)</em> or <em>Beginning Expectations (BE)</em> conduct marks allowed.
                </li>
              </ul>
            </div>

            {/* Senior Specific Rules */}
            <div style={{ border: '1px solid var(--color-border)', padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '1rem', marginBottom: '0.5rem' }}>
                Senior Year (Grade 12) Regulations
              </div>
              <ul style={{ paddingLeft: '1.25rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li>The final report card audit takes place at the end of Semester 1 of Senior year.</li>
                <li>
                  <strong>Prior Probation + Senior Semester 1 Probation:</strong> Results in immediate <strong>Dismissal</strong> from the society.
                </li>
                <li>
                  <strong>First Probation in Senior Semester 1:</strong> The student is <strong>still permitted to graduate with NHS honors</strong>.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 2: Probation Rules */}
        <div className="sharp-card" style={{ padding: '2rem', borderLeft: '4px solid var(--color-gold)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <AlertTriangle size={22} color="var(--color-gold)" />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-navy)', margin: 0 }}>
              Chapter Probation Rules
            </h2>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            A member will be immediately placed on official chapter probation upon any of the following occurrences:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>1. Academic Deficiency</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                Falling below the required GPA average (5.80, or 5.60 for 4 HL students).
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>2. Conduct & Effort Flags</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                Receiving Approaching Expectations (AE) or Beginning Expectations (BE) in more than one class.
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>3. Trimester Inactivity</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                Not participating in any NHS activity for an entire trimester (tutoring room, project volunteering, or project leadership).
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>4. Meeting Absences (2 Absences)</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                Accumulating 2 unexcused meeting absences triggers automatic chapter probation.
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Dismissal Rules */}
        <div className="sharp-card" style={{ padding: '2rem', borderLeft: '4px solid var(--color-terracotta)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <XCircle size={22} color="var(--color-terracotta)" />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-navy)', margin: 0 }}>
              Dismissal & Account Restriction Rules
            </h2>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            A member will be dismissed from the National Honor Society and their account placed in <strong>Restricted Mode</strong> for any of the following:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--color-terracotta-bg)', border: '1px solid #FECACA', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <ShieldAlert size={20} color="var(--color-terracotta)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--color-terracotta-text)' }}>Accumulating Two Probations:</strong>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-terracotta-text)', marginTop: '0.25rem' }}>
                  Being put on probation more than once at any given time results in automatic chapter dismissal and loss of graduation honors.
                </div>
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--color-terracotta-bg)', border: '1px solid #FECACA', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <ShieldAlert size={20} color="var(--color-terracotta)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--color-terracotta-text)' }}>Major Disciplinary Violations:</strong>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-terracotta-text)', marginTop: '0.25rem' }}>
                  Found guilty of breaking fundamental school codes, such as academic dishonesty (cheating/plagiarism), physical or verbal violence, possession or use of controlled substances on campus, and excessive tardiness.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
