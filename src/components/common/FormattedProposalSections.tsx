import React from 'react';
import { Award, ExternalLink } from 'lucide-react';
import type { ProjectProposal } from '../../types/nhs';
import { formatProposalContent } from '../../utils/proposalFormatter';

function renderTextWithLinks(text: string): React.ReactNode {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, idx) => {
    if (/^https?:\/\/[^\s)]+$/.test(part)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            color: '#1D4ED8',
            textDecoration: 'underline',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            wordBreak: 'break-all',
            fontWeight: 500,
          }}
        >
          {part} <ExternalLink size={12} />
        </a>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

interface FormattedProposalSectionsProps {
  project: Partial<ProjectProposal>;
  showInternalLogistics?: boolean;
}

export const FormattedProposalSections: React.FC<FormattedProposalSectionsProps> = ({
  project,
  showInternalLogistics = false,
}) => {
  const formatted = formatProposalContent(project);

  const labelStyle: React.CSSProperties = {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    display: 'block',
    marginBottom: '0.45rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Overview / Background */}
      <div>
        <span style={labelStyle}>Overview & Background</span>
        <div
          style={{
            margin: 0,
            fontSize: '0.9rem',
            lineHeight: 1.65,
            color: 'var(--color-text-primary)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {renderTextWithLinks(formatted.overview)}
        </div>
      </div>

      {/* Objectives */}
      {formatted.objectives.length > 0 && (
        <div>
          <span style={labelStyle}>Objectives</span>
          <ul
            style={{
              margin: 0,
              paddingLeft: '1.25rem',
              fontSize: '0.88rem',
              lineHeight: 1.65,
              color: 'var(--color-text-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            {formatted.objectives.map((obj, i) => (
              <li key={i}>{renderTextWithLinks(obj)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Event Details & Execution Plan */}
      {formatted.eventDetails.length > 0 && (
        <div>
          <span style={labelStyle}>Event Details & Execution Plan</span>
          <ol
            style={{
              margin: 0,
              paddingLeft: '1.25rem',
              fontSize: '0.88rem',
              lineHeight: 1.65,
              color: 'var(--color-text-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
            }}
          >
            {formatted.eventDetails.map((det, i) => (
              <li key={i}>{renderTextWithLinks(det)}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Volunteer / Judge Roles (if extracted from proposal) */}
      {formatted.roles.length > 0 && (
        <div>
          <span style={labelStyle}>Volunteer & Judge Roles</span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {formatted.roles.map((r, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid var(--color-border)',
                  padding: '0.75rem 0.9rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: 'var(--color-navy)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '0.25rem',
                  }}
                >
                  {r.label}
                </div>
                <div style={{ fontSize: '0.83rem', lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>
                  {renderTextWithLinks(r.description)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Structured Judging / Evaluation Rubric (if present) */}
      {formatted.rubric && formatted.rubric.criteria.length > 0 && (
        <div>
          <span style={labelStyle}>
            Judging & Evaluation Rubric{formatted.rubric.totalPoints ? ` (${formatted.rubric.totalPoints})` : ''}
          </span>
          {formatted.rubric.note && (
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              {formatted.rubric.note}
            </p>
          )}
          <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.8rem',
                backgroundColor: '#FFFFFF',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: 'var(--color-navy)', fontWeight: 700, width: '18%' }}>
                    Criteria
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#166534', fontWeight: 700, width: '20.5%' }}>
                    Excellent
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#1E40AF', fontWeight: 700, width: '20.5%' }}>
                    Good
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#92400E', fontWeight: 700, width: '20.5%' }}>
                    Satisfactory
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#991B1B', fontWeight: 700, width: '20.5%' }}>
                    Needs Improvement
                  </th>
                </tr>
              </thead>
              <tbody>
                {formatted.rubric.criteria.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom:
                        formatted.rubric && idx < formatted.rubric.criteria.length - 1
                          ? '1px solid #E2E8F0'
                          : 'none',
                      verticalAlign: 'top',
                    }}
                  >
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: 'var(--color-navy)' }}>
                      <div>{row.category}</div>
                      {row.points && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 500, marginTop: '0.1rem' }}>
                          {row.points}
                        </div>
                      )}
                    </td>
                    {[0, 1, 2, 3].map((tierIdx) => {
                      const tier = row.tiers[tierIdx];
                      return (
                        <td key={tierIdx} style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                          {tier ? (
                            <div>
                              <strong style={{ color: 'var(--color-navy)', fontSize: '0.74rem', display: 'block', marginBottom: '0.15rem' }}>
                                {tier.score} pts
                              </strong>
                              <span>{tier.description}</span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Financials / Budget (Leadership Only) */}
      {showInternalLogistics && (
        <div>
          <span style={labelStyle}>Budget & Anticipated Costs</span>
          <div
            style={{
              backgroundColor: 'var(--color-canvas)',
              border: '1px solid var(--color-border)',
              padding: '0.85rem 1.15rem',
            }}
          >
            {formatted.costs.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.85rem', lineHeight: 1.6 }}>
                {formatted.costs.map((c, i) => (
                  <li key={i} style={{ fontFamily: /\d+/.test(c) ? 'monospace' : 'inherit' }}>
                    {c}
                  </li>
                ))}
              </ul>
            ) : (
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                No monetary costs expected.
              </span>
            )}
          </div>
        </div>
      )}

      {/* School Facilities & Support Needed (Leadership Only) */}
      {showInternalLogistics && formatted.needsFromSchool.length > 0 && (
        <div>
          <span style={labelStyle}>School Facilities & Support Needed</span>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: 1.6 }}>
            {formatted.needsFromSchool.map((need, i) => (
              <li key={i}>{renderTextWithLinks(need)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recognition & Awards */}
      {formatted.awards && (
        <div>
          <span style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Award size={13} /> Recognition & Awards
          </span>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', lineHeight: 1.55 }}>
            {renderTextWithLinks(formatted.awards)}
          </div>
        </div>
      )}
    </div>
  );
};
