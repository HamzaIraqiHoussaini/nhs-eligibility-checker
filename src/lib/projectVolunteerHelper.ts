import type { ProjectComment, ProjectProposal } from '../types/nhs';

export interface VolunteeringConfig {
  is_open: boolean;
  recruitment_open?: boolean;
  questionnaire_url?: string;
  instructions?: string;
  updated_at?: string;
  updated_by?: string;
}

/**
 * Extracts the volunteering recruitment configuration from the proposal's comments
 */
export function parseVolunteeringConfig(comments?: ProjectComment[] | string | null): VolunteeringConfig {
  if (!comments) return { is_open: false, recruitment_open: false };
  let commentList: ProjectComment[] = [];
  if (Array.isArray(comments)) {
    commentList = comments;
  } else if (typeof comments === 'string') {
    try {
      const parsed = JSON.parse(comments);
      if (Array.isArray(parsed)) commentList = parsed;
    } catch {
      return { is_open: false, recruitment_open: false };
    }
  }

  const configComment = commentList.find((c) => c && c.id === '__volunteering_config__');
  if (!configComment) return { is_open: false, recruitment_open: false };

  try {
    const data = JSON.parse(configComment.content);
    const isOpen = Boolean(data.is_open ?? data.recruitment_open);
    return {
      is_open: isOpen,
      recruitment_open: isOpen,
      questionnaire_url: typeof data.questionnaire_url === 'string' && data.questionnaire_url.trim() ? data.questionnaire_url.trim() : undefined,
      instructions: typeof data.instructions === 'string' && data.instructions.trim() ? data.instructions.trim() : undefined,
      updated_at: data.updated_at || configComment.created_at,
      updated_by: data.updated_by || configComment.author_name,
    };
  } catch {
    return { is_open: false, recruitment_open: false };
  }
}

/**
 * Generates an updated comments array that embeds the volunteering configuration
 * and appends an audit message so chapter leaders have transparent records.
 */
export function createCommentsWithVolunteeringUpdate(
  existingComments: ProjectComment[] | undefined | null,
  newConfig: Partial<VolunteeringConfig>,
  user?: { id: string; email?: string | null } | null,
  profile?: { full_name?: string | null; role?: string | null } | null,
  customAuditMessage?: string
): ProjectComment[] {
  const currentList = Array.isArray(existingComments) ? existingComments : [];
  const otherComments = currentList.filter((c) => c && c.id !== '__volunteering_config__');
  const existingConfig = parseVolunteeringConfig(existingComments);

  const authorName = profile?.full_name || user?.email?.split('@')[0] || 'Chapter Leader';
  const authorRole = (profile?.role as any) || 'leadership';
  const authorId = user?.id || 'system';

  const mergedIsOpen = newConfig.is_open !== undefined
    ? newConfig.is_open
    : newConfig.recruitment_open !== undefined
    ? newConfig.recruitment_open
    : existingConfig.is_open;

  const mergedQuestionnaire = newConfig.questionnaire_url !== undefined
    ? newConfig.questionnaire_url
    : existingConfig.questionnaire_url;

  const mergedInstructions = newConfig.instructions !== undefined
    ? newConfig.instructions
    : existingConfig.instructions;

  const configComment: ProjectComment = {
    id: '__volunteering_config__',
    author_id: authorId,
    author_name: 'System',
    author_email: 'portal@cas.ac.ma',
    author_role: 'system',
    content: JSON.stringify({
      is_open: mergedIsOpen,
      recruitment_open: mergedIsOpen,
      questionnaire_url: mergedQuestionnaire || '',
      instructions: mergedInstructions || '',
      updated_at: new Date().toISOString(),
      updated_by: authorName,
    }),
    created_at: new Date().toISOString(),
  };

  const auditContent = customAuditMessage || (mergedIsOpen
    ? `Opened volunteer recruitment${mergedQuestionnaire ? ` with questionnaire (${mergedQuestionnaire})` : ''} by ${authorName}.`
    : `Closed volunteer recruitment for this project by ${authorName}.`);

  const auditComment: ProjectComment = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    author_id: authorId,
    author_name: authorName,
    author_email: user?.email || '',
    author_role: authorRole,
    content: auditContent,
    created_at: new Date().toISOString(),
  };

  return [...otherComments, configComment, auditComment];
}

/**
 * Filters out internal system comments (like __volunteering_config__) for display in comment feeds
 */
export function getDisplayComments(comments?: ProjectComment[] | string | null): ProjectComment[] {
  if (!comments) return [];
  let list: ProjectComment[] = [];
  if (Array.isArray(comments)) {
    list = comments;
  } else if (typeof comments === 'string') {
    try {
      const parsed = JSON.parse(comments);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      return [];
    }
  }
  return list.filter((c) => c && c.id !== '__volunteering_config__');
}

/**
 * Resolves a reviewer's full name, role, timestamp, and notes for Stage 1, Stage 2, or Stage 3
 */
export function resolveStageReviewer(
  stage: 1 | 2 | 3,
  proposal: ProjectProposal,
  profilesMap?: Record<string, { full_name: string; role: string; email?: string }>
): {
  isDecided: boolean;
  decision?: 'approved' | 'rejected';
  reviewerName: string;
  reviewerRole: string;
  reviewedAt?: string;
  notes?: string;
} {
  let decision: 'approved' | 'rejected' | undefined;
  let reviewerId: string | undefined;
  let reviewedAt: string | undefined;
  let notes: string | undefined;
  let fallbackName = 'Chapter Leadership';
  let defaultRole = 'Leadership Reviewer';

  if (stage === 1) {
    decision = proposal.leadership_decision;
    reviewerId = proposal.leadership_reviewer_id;
    reviewedAt = proposal.leadership_reviewed_at;
    notes = proposal.leadership_notes;
    fallbackName = proposal.leadership_reviewer_name || 'Chapter Leadership';
    defaultRole = 'Leadership Reviewer';
  } else if (stage === 2) {
    decision = proposal.supervisor_decision;
    reviewerId = proposal.supervisor_reviewer_id;
    reviewedAt = proposal.supervisor_reviewed_at;
    notes = proposal.supervisor_notes;
    fallbackName = proposal.supervisor_reviewer_name || proposal.advisor_name || 'Faculty Advisor';
    defaultRole = 'Faculty Supervisor';
  } else if (stage === 3) {
    decision = proposal.administrator_decision || (proposal.status === 'approved' || proposal.status === 'completed' ? 'approved' : undefined);
    reviewerId = proposal.administrator_reviewer_id;
    reviewedAt = proposal.administrator_reviewed_at;
    notes = proposal.administrator_notes;
    fallbackName = proposal.administrator_reviewer_name || 'Chapter Administrator';
    defaultRole = 'Chapter Administrator';
  }

  // If reviewerId matches a known profile in profilesMap
  if (reviewerId && profilesMap && profilesMap[reviewerId]) {
    const prof = profilesMap[reviewerId];
    return {
      isDecided: Boolean(decision),
      decision,
      reviewerName: prof.full_name,
      reviewerRole: prof.role === 'administrator' ? 'Chapter Administrator' : prof.role === 'supervisor' ? 'Faculty Supervisor' : 'Leadership Reviewer',
      reviewedAt,
      notes,
    };
  }

  // Look in comments for decision audit log if reviewerId isn't found
  const rawComments = Array.isArray(proposal.comments) ? proposal.comments : [];
  const searchPattern = stage === 1 ? 'stage 1' : stage === 2 ? 'stage 2' : 'stage 3';
  const auditComment = rawComments.find((c) =>
    c && c.content && c.content.toLowerCase().includes(searchPattern) && (c.content.toLowerCase().includes('approved') || c.content.toLowerCase().includes('rejected') || c.content.toLowerCase().includes('determination'))
  );

  if (auditComment) {
    return {
      isDecided: Boolean(decision || auditComment.content.includes('APPROVED') || auditComment.content.includes('REJECTED')),
      decision: decision || (auditComment.content.includes('APPROVED') ? 'approved' : 'rejected'),
      reviewerName: auditComment.author_name || fallbackName,
      reviewerRole: auditComment.author_role === 'administrator' ? 'Chapter Administrator' : auditComment.author_role === 'supervisor' ? 'Faculty Supervisor' : defaultRole,
      reviewedAt: reviewedAt || auditComment.created_at,
      notes: notes || undefined,
    };
  }

  return {
    isDecided: Boolean(decision),
    decision,
    reviewerName: fallbackName,
    reviewerRole: defaultRole,
    reviewedAt,
    notes,
  };
}
