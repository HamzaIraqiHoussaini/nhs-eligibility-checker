import type { ProjectComment, ProjectProposal } from '../types/nhs';

export interface RubricCriterion {
  category: string;
  points: string;
  tiers: { score: string; description: string }[];
}

export interface ProposalRubric {
  totalPoints?: string;
  note?: string;
  criteria: RubricCriterion[];
}

export interface FormattedProposalContent {
  /** Clean 1-2 paragraph overview without Google Doc header/footer or embedded sections */
  overview: string;
  /** Short 1-paragraph summary suitable for list cards */
  cardSummary: string;
  /** Deduplicated, clean list of project objectives */
  objectives: string[];
  /** Deduplicated, clean list of execution steps / event details */
  eventDetails: string[];
  /** Optional structured judge/volunteer role descriptions */
  roles: { label: string; description: string }[];
  /** Optional structured judging rubric parsed from comments or pasted proposal text */
  rubric: ProposalRubric | null;
  /** Clean costs list */
  costs: string[];
  /** Clean school facility needs list */
  needsFromSchool: string[];
  /** Clean awards description */
  awards: string | null;
}

export function parseRubricFromComments(comments?: ProjectComment[] | string | null): ProposalRubric | null {
  if (!comments) return null;
  let commentList: ProjectComment[] = [];
  if (Array.isArray(comments)) {
    commentList = comments;
  } else if (typeof comments === 'string') {
    try {
      const parsed = JSON.parse(comments);
      if (Array.isArray(parsed)) commentList = parsed;
    } catch {
      return null;
    }
  }

  const rubricComment = commentList.find((c) => c && c.id === '__proposal_rubric__');
  if (!rubricComment || !rubricComment.content) return null;

  try {
    const data = JSON.parse(rubricComment.content);
    if (data && Array.isArray(data.criteria) && data.criteria.length > 0) {
      return {
        totalPoints: typeof data.totalPoints === 'string' && data.totalPoints.trim() ? data.totalPoints.trim() : undefined,
        note: typeof data.note === 'string' && data.note.trim() ? data.note.trim() : undefined,
        criteria: data.criteria,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function upsertProposalRubricInComments(
  existingComments: ProjectComment[] | string | undefined | null,
  rubric: ProposalRubric | null
): ProjectComment[] {
  let currentList: ProjectComment[] = [];
  if (Array.isArray(existingComments)) {
    currentList = existingComments;
  } else if (typeof existingComments === 'string') {
    try {
      const parsed = JSON.parse(existingComments);
      if (Array.isArray(parsed)) currentList = parsed;
    } catch {
      currentList = [];
    }
  }

  const withoutRubric = currentList.filter((c) => c && c.id !== '__proposal_rubric__');
  if (!rubric || !Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
    return withoutRubric;
  }

  const rubricComment: ProjectComment = {
    id: '__proposal_rubric__',
    author_id: 'system',
    author_name: 'System',
    author_email: 'portal@cas.ac.ma',
    author_role: 'system',
    content: JSON.stringify(rubric),
    created_at: new Date().toISOString(),
  };

  return [...withoutRubric, rubricComment];
}

/**
 * Clean up stray whitespace, weird punctuation before URLs (e.g. "advance  . https://"),
 * and normalize line breaks.
 */
export function cleanSingleLineText(raw: string): string {
  return raw
    .replace(/\t+/g, ' ')
    .replace(/\s+\.\s+(https?:\/\/)/g, '. $1')
    .replace(/\s+—>\s+/g, ' — ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Parses a ProjectProposal (even if the student pasted their entire Google Doc
 * proposal template into `background`) into clean, structured sections.
 */
export function formatProposalContent(project: Partial<ProjectProposal>): FormattedProposalContent {
  const rawBg = (project.background || '').replace(/\r\n/g, '\n');

  // 1. Strip Google Doc header boilerplate lines and signature footer
  let cleanedBg = rawBg
    .replace(/^National Honor Society Project Proposal\s*\n?/gim, '')
    .replace(/^[ \t]*Proposed by\s*:.*$/gim, '')
    .replace(/^[ \t]*Proposed to\s*:.*$/gim, '')
    .replace(/^[ \t]*Proposed on\s*:.*$/gim, '')
    .replace(/^[ \t]*Project Date\s*:.*$/gim, '')
    .replace(/^[ \t]*Proposed Project\s*:.*$/gim, '')
    .replace(/^[ \t]*Room\s*:.*$/gim, '')
    .replace(/Approval Signatures\s*:?[\s\S]*$/i, '')
    .trim();

  // Check if the background contains embedded Google Doc sections ("Overview:", "Objective:", "Event Details:")
  const hasEmbeddedSections =
    /(?:^|\n)\s*(?:Overview|Objective|Objectives|Event Details|Criteria for judging|Judging Rubric)\s*:?/i.test(
      cleanedBg
    );

  let overview = cleanedBg;
  const extraObjectives: string[] = [];
  const extraEventDetails: string[] = [];
  const roles: { label: string; description: string }[] = [];
  let rubric: FormattedProposalContent['rubric'] = null;
  let extraAwards: string | null = null;

  if (hasEmbeddedSections) {
    // Extract Overview section
    const overviewMatch = cleanedBg.match(
      /(?:^|\n)\s*Overview\s*:\s*([\s\S]*?)(?=(?:\n\s*(?:Objective|Objectives|Event Details|Criteria for judging|Judging Rubric|Needs From the School|Volunteers)\b)|$)/i
    );
    if (overviewMatch && overviewMatch[1].trim()) {
      overview = cleanSingleLineText(overviewMatch[1]);
    } else {
      // Fallback: take everything before Objective: or Event Details:
      const beforeObj = cleanedBg.split(/\n\s*(?:Objective|Objectives|Event Details)\s*:/i)[0];
      overview = cleanSingleLineText(beforeObj);
    }

    // Extract Objectives section if present in pasted doc
    const objMatch = cleanedBg.match(
      /(?:^|\n)\s*Objectives?\s*:\s*([\s\S]*?)(?=(?:\n\s*(?:Event Details|Criteria for judging|Judging Rubric|Needs From the School|Volunteers)\b)|$)/i
    );
    if (objMatch && objMatch[1].trim()) {
      const lines = objMatch[1]
        .split('\n')
        .map((l) => cleanSingleLineText(l.replace(/^[-•*]\s*/, '')))
        .filter(Boolean);
      extraObjectives.push(...lines);
    }

    // Extract Event Details section if present in pasted doc
    const detailsMatch = cleanedBg.match(
      /(?:^|\n)\s*Event Details\s*:\s*([\s\S]*?)(?=(?:\n\s*(?:Criteria for judging|Judging Rubric|Needs From the School)\b)|$)/i
    );
    if (detailsMatch && detailsMatch[1].trim()) {
      const detailsBlock = detailsMatch[1].trim();

      // Extract Judge / Role definitions (e.g. "Judge 1:\n Keeps track...")
      const judgeRegex = /(Judge\s*\d+)\s*:\s*\n?\s*([^\n]+)/gi;
      let jMatch: RegExpExecArray | null;
      while ((jMatch = judgeRegex.exec(detailsBlock)) !== null) {
        roles.push({
          label: jMatch[1].trim(),
          description: cleanSingleLineText(jMatch[2]),
        });
      }

      // Remove Judge lines from detailsBlock and process remaining lines
      const withoutJudges = detailsBlock.replace(/Judge\s*\d+\s*:\s*\n?\s*[^\n]+/gi, '');
      const rawLines = withoutJudges
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      // Merge continuation lines that start with "." or "https://"
      const mergedLines: string[] = [];
      for (const line of rawLines) {
        if (/^[.]?\s*https?:\/\//i.test(line) && mergedLines.length > 0) {
          const cleanUrlPart = line.replace(/^[.\s]+/, '');
          mergedLines[mergedLines.length - 1] = `${mergedLines[mergedLines.length - 1].replace(/[.\s]+$/, '')}. ${cleanUrlPart}`;
        } else {
          mergedLines.push(cleanSingleLineText(line));
        }
      }
      extraEventDetails.push(...mergedLines);
    }

    // Extract Judging Rubric if present
    const rubricMatch = cleanedBg.match(
      /(?:Criteria for judging|Judging Rubric)[\s\S]*?(?=(?:\n\s*(?:Needs From the School|Volunteers|Approval Signatures)\b)|$)/i
    );
    if (rubricMatch) {
      const rubricBlock = rubricMatch[0];
      const criteriaList: RubricCriterion[] = [];
      const criterionRegex = /([A-Za-z &()]+?)\s*\((\d+\s*pts?)\)\s*\n([\s\S]*?)(?=(?:[A-Za-z &()]+\(\d+\s*pts?\))|(?:\/\s*\d+\s*pts?)|$)/gi;
      let cMatch: RegExpExecArray | null;
      while ((cMatch = criterionRegex.exec(rubricBlock)) !== null) {
        const category = cleanSingleLineText(cMatch[1]);
        const points = cMatch[2].trim();
        const tiersRaw = cMatch[3]
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        const tiers: { score: string; description: string }[] = [];
        for (const tLine of tiersRaw) {
          const tParts = tLine.match(/^(\d+(?:-\d+)?)\s*:\s*(.+)$/);
          if (tParts) {
            tiers.push({
              score: tParts[1].trim(),
              description: cleanSingleLineText(tParts[2]),
            });
          }
        }
        if (category && tiers.length > 0) {
          criteriaList.push({ category, points, tiers });
        }
      }

      const totalMatch = rubricBlock.match(/\/\s*(\d+\s*pts?)/i);
      const certMatch = rubricBlock.match(/All participants will receive[^\n]+/i);
      if (certMatch) {
        extraAwards = cleanSingleLineText(certMatch[0]);
      }

      if (criteriaList.length > 0) {
        rubric = {
          totalPoints: totalMatch ? `${totalMatch[1]} total` : undefined,
          note: certMatch ? cleanSingleLineText(certMatch[0]) : undefined,
          criteria: criteriaList,
        };
      }
    }

    // Extract Volunteers note if present at the end of pasted doc
    const volMatch = cleanedBg.match(
      /(?:^|\n)\s*Volunteers\s*\n([\s\S]*?)(?=(?:\n\s*Approval Signatures)|$)/i
    );
    if (volMatch && volMatch[1].trim()) {
      const volLine = cleanSingleLineText(volMatch[1].replace(/\n+/g, ' '));
      if (volLine) {
        extraEventDetails.push(`Volunteers: ${volLine}`);
      }
    }
  } else {
    // Normal multi-line or single-line background
    overview = cleanedBg
      .replace(/\t+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Merge and deduplicate objectives
  const rawObjectives = Array.isArray(project.objectives) ? project.objectives : [];
  const mergedObjectives: string[] = [];
  const seenObj = new Set<string>();
  for (const item of [...rawObjectives, ...extraObjectives]) {
    const cleaned = cleanSingleLineText(typeof item === 'string' ? item : String(item));
    if (!cleaned) continue;
    const key = cleaned.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seenObj.has(key)) {
      seenObj.add(key);
      mergedObjectives.push(cleaned);
    }
  }

  // Clean and deduplicate eventDetails
  // Prefer the structured extraEventDetails when the raw event_details had merged lines
  const sourceDetails =
    extraEventDetails.length > 0
      ? extraEventDetails
      : Array.isArray(project.event_details)
      ? project.event_details
      : [];
  const mergedDetails: string[] = [];
  const seenDet = new Set<string>();
  for (const item of sourceDetails) {
    const cleaned = cleanSingleLineText(typeof item === 'string' ? item : String(item))
      .replace(/^Volunteers\s+(?=\d)/i, 'Volunteers: ');
    if (!cleaned) continue;
    const key = cleaned.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
    if (!seenDet.has(key)) {
      seenDet.add(key);
      mergedDetails.push(cleaned);
    }
  }

  // Clean costs
  const costs = (Array.isArray(project.costs) ? project.costs : [])
    .map((c) => cleanSingleLineText(typeof c === 'string' ? c : String(c)))
    .filter(Boolean);

  // Clean needsFromSchool
  const needsFromSchool = (Array.isArray(project.needs_from_school) ? project.needs_from_school : [])
    .map((n) => cleanSingleLineText(typeof n === 'string' ? n : String(n)))
    .filter(Boolean);

  // Clean awards
  let awards = project.awards ? cleanSingleLineText(project.awards) : null;
  if (extraAwards && (!awards || awards.toLowerCase() === 'certificate')) {
    awards = extraAwards;
  }

  // Card summary: first paragraph of overview, capped cleanly
  const firstParagraph = overview.split(/\n{2,}/)[0] || overview;
  const cardSummary =
    firstParagraph.length > 320
      ? `${firstParagraph.slice(0, 317).trimEnd()}...`
      : firstParagraph;

  const storedRubric = parseRubricFromComments(project.comments);

  return {
    overview: overview || 'No project overview provided.',
    cardSummary: cardSummary || 'No project overview provided.',
    objectives: mergedObjectives,
    eventDetails: mergedDetails,
    roles,
    rubric: storedRubric || rubric,
    costs,
    needsFromSchool,
    awards,
  };
}

