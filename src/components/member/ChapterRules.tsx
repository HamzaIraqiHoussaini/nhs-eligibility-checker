import React from 'react';
import { BookOpen, ShieldAlert, GraduationCap, AlertTriangle, XCircle, Award, CheckCircle2, Clock, Users } from 'lucide-react';

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
          Official eligibility prerequisites, participation quotas, probation mechanisms, dismissal criteria, and leadership application factors for the Casablanca American School Chapter.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Section 1: Academic Standing Required to Maintain Membership */}
        <div className="sharp-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <GraduationCap size={22} color="var(--color-oxford)" />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-navy)', margin: 0 }}>
              1. Academic Standing Required to Maintain Membership
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.88rem', color: 'var(--color-text-primary)' }}>
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#EFF6FF', borderLeft: '3px solid var(--color-oxford)' }}>
              <strong>Continuous Chapter Academic Standards:</strong> Inducted members across <strong>Grades 10, 11, and 12</strong> must continuously maintain these academic standing thresholds on every semester report card audit to remain in Good Standing.
              <br />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                *Failure to maintain these thresholds on any semester audit results in immediate chapter probation.
              </span>
            </div>

            {/* Grade 10 Criteria */}
            <div style={{ border: '1px solid var(--color-border)', padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '1rem', marginBottom: '0.5rem' }}>
                Grade 10 Academic Standard to Stay in NHS
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
                Grade 11 & 12 Academic Standard to Stay in NHS
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

        {/* Section 2: Participation Rules */}
        <div className="sharp-card" style={{ padding: '2rem', borderLeft: '4px solid var(--color-oxford)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <Award size={22} color="var(--color-oxford)" />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-navy)', margin: 0 }}>
              2. Participation & Project Rules
            </h2>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
            Every inducted member must actively maintain the pillars of Scholarship and Service by fulfilling semester and annual project quotas:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <CheckCircle2 size={16} color="var(--color-sage)" />
                <strong style={{ color: 'var(--color-navy)', fontSize: '0.95rem' }}>Lead at Least 1 Project / Semester</strong>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                All members are required to propose and lead at least <strong>one approved project per semester</strong>.
              </p>
            </div>

            <div style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <Users size={16} color="var(--color-oxford)" />
                <strong style={{ color: 'var(--color-navy)', fontSize: '0.95rem' }}>Volunteer in at Least 2 Projects / Semester</strong>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                All members are required to volunteer in at least <strong>2 projects a semester</strong> (excluding their yearly project).
              </p>
            </div>

            <div style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <Clock size={16} color="var(--color-gold)" />
                <strong style={{ color: 'var(--color-navy)', fontSize: '0.95rem' }}>Project Cap: Max 2 Projects / Semester (4 Projects / Year)</strong>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                A member may lead a maximum of <strong>2 projects per semester</strong>, totaling a maximum cap of <strong>4 projects per year</strong>. At least one of them <strong>has to be service-based</strong> (including yearly projects).
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Probation Rules */}
        <div className="sharp-card" style={{ padding: '2rem', borderLeft: '4px solid var(--color-gold)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <AlertTriangle size={22} color="var(--color-gold)" />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-navy)', margin: 0 }}>
              3. Chapter Probation Rules
            </h2>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            A student will be put on probation for any of the following reasons:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1.1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.35rem' }}>1. Academic Deficiency</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Falling below the grade average requirement (5.80 overall, or 5.60 for 4 IB HL candidates).
              </div>
            </div>

            <div style={{ padding: '1.1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.35rem' }}>2. Conduct & Effort Flags</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Receiving Approaching Expectations (AE) or Beginning Expectations (BE) in more than one class.
              </div>
            </div>

            <div style={{ padding: '1.1rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <div style={{ fontWeight: 700, color: '#92400E', marginBottom: '0.35rem' }}>3. Semester Inactivity & Project Deficit</div>
              <div style={{ fontSize: '0.82rem', color: '#78350F', lineHeight: 1.5 }}>
                <strong>Not participating in any NHS activity for an entire semester, AND not leading an NHS project for an entire semester</strong> (Failing to lead at least 1 project and volunteer in at least 2 projects).
              </div>
            </div>

            <div style={{ padding: '1.1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.35rem' }}>4. Meeting Absences (2 Absences)</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Having <strong>two unexcused absences</strong> in a semester.
                <div style={{ marginTop: '0.4rem', color: 'var(--color-terracotta)', fontWeight: 600, fontSize: '0.78rem' }}>
                  *Crucial rule: Being 5 minutes late to a meeting constitutes an absence.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Dismissal Rules */}
        <div className="sharp-card" style={{ padding: '2rem', borderLeft: '4px solid var(--color-terracotta)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <XCircle size={22} color="var(--color-terracotta)" />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-navy)', margin: 0 }}>
              4. Dismissal & Account Restriction Rules
            </h2>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            A student will be dismissed from the National Honor Society and their account placed in <strong>Restricted Mode</strong> for any of the following reasons:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--color-terracotta-bg)', border: '1px solid #FECACA', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <ShieldAlert size={20} color="var(--color-terracotta)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--color-terracotta-text)' }}>Multiple Probations:</strong>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-terracotta-text)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                  Being put on probation more than once at any given time results in automatic chapter dismissal, revocation of chapter credentials, and loss of graduation honors.
                </div>
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--color-terracotta-bg)', border: '1px solid #FECACA', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <ShieldAlert size={20} color="var(--color-terracotta)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--color-terracotta-text)' }}>Major Disciplinary & Code of Conduct Violations:</strong>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-terracotta-text)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                  Found guilty of breaking any school rule, such as academic dishonesty (cheating or plagiarism), physical or verbal violence, possession or use of a controlled substance on campus, and excessive tardiness.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Leadership Application Factors */}
        <div className="sharp-card" style={{ padding: '2rem', borderLeft: '4px solid var(--color-navy)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <GraduationCap size={22} color="var(--color-navy)" />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-navy)', margin: 0 }}>
              5. Leadership Application Factors
            </h2>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            When selecting next year's Executive Leadership and Chapter Officers, candidates are evaluated on the following rigorous standards:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>Good Standing Requirement</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                <strong>No member on probation may be chosen for Leadership.</strong> Only members in active Good Standing are eligible.
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>Formal Interview</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Candidate interview with the Chapter Faculty Advisor and outgoing leadership board.
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>1-Minute Chapter Speech</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                A 1-minute speech delivered to all chapter members at an official NHS meeting.
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>Quality Over Quantity</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Proven <strong>quality of projects rather than quantity</strong>. Initiatives must demonstrate genuine community impact and execution integrity.
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>Academic Grades</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Consistently high academic standing and GPA in assessed courses.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
