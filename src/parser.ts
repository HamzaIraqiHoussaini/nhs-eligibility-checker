import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Setup pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

// ===================== TYPES =====================

export interface ParseResult {
  text: string;
  fullText: string;
  studentName: string;
  average: number;
  hasAEorBE: boolean;
  has3OrLower: boolean;
  isEligible: boolean;
  error?: string;
  grades: number[];
}

export interface StudentResult {
  studentName: string;
  gradeLevel: number;
  average: number;
  hasAEorBE: boolean;
  has3OrLower: boolean;
  isEligible: boolean;
  grades: number[];
  failReasons: string[];
}

export interface BatchResult {
  semester: 1 | 2;
  totalStudents: number;
  studentsSkipped: number;
  students: StudentResult[];
  eligibleStudents: StudentResult[];
  ineligibleStudents: StudentResult[];
}

// ===================== SINGLE STUDENT MODE =====================

function emptyResult(error?: string): ParseResult {
  return { text: '', fullText: '', studentName: '', average: 0, hasAEorBE: false, has3OrLower: false, isEligible: false, grades: [], error };
}

export async function parseFile(file: File): Promise<ParseResult> {
  try {
    let pagesText: string[];
    if (file.type === 'application/pdf') {
      pagesText = await extractPDFPages(file);
    } else if (file.type.startsWith('image/')) {
      pagesText = [await extractTextFromImage(file)];
    } else {
      return emptyResult('Unsupported file type.');
    }

    const fullText = pagesText.join(' ');
    const studentName = extractStudentName(fullText);
    const gradingText = pagesText.length > 1 ? pagesText.slice(1).join(' ') : fullText;

    return analyzeSingleStudent(gradingText, fullText, studentName);
  } catch (error) {
    console.error('Error parsing file:', error);
    return emptyResult('Failed to extract text from file.');
  }
}

// ===================== BATCH MODE =====================

export async function parseBatchFile(
  file: File,
  onProgress?: (current: number, total: number, status: string) => void,
): Promise<BatchResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;

  // Step 1: Extract all pages as flat text
  let allText = '';
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str.trim())
      .filter((s: string) => s.length > 0)
      .join(' ');
    allText += normalizePDFText(text) + ' ';

    if (onProgress) onProgress(i, totalPages, `Extracting page ${i} of ${totalPages}...`);
  }

  // Step 2: Split into student sections.
  // Each student's report card starts with "Grade X Report Card".
  // We split on this boundary and keep sections that contain "Student:".
  const studentSections = allText
    .split(/(?=Grade\s+\d+\s+Report\s+Card)/i)
    .filter(section => /Student:/i.test(section));

  // Step 3: Detect semester from the overall text
  const semester = detectSemester(allText);

  // Step 4: Determine minimum grade level
  const minGrade = semester === 1 ? 10 : 9;

  // Step 5: Process each student
  const allStudents: StudentResult[] = [];
  let skipped = 0;

  for (let i = 0; i < studentSections.length; i++) {
    if (onProgress) {
      onProgress(i + 1, studentSections.length, `Analyzing student ${i + 1} of ${studentSections.length}...`);
    }

    const student = analyzeStudentSection(studentSections[i], minGrade);
    if (student === null) {
      skipped++;
    } else {
      allStudents.push(student);
    }
  }

  const eligible = allStudents.filter(s => s.isEligible);
  const ineligible = allStudents.filter(s => !s.isEligible);

  return {
    semester,
    totalStudents: allStudents.length,
    studentsSkipped: skipped,
    students: allStudents,
    eligibleStudents: eligible,
    ineligibleStudents: ineligible,
  };
}

function normalizePDFText(text: string): string {
  return text
    .replace(/E\s*ff?\s*ort/gi, 'Effort')
    .replace(/C\s*onduct/gi, 'Conduct')
    .replace(/P\s*ersonal\s+Habits/gi, 'Personal Habits');
}

// ===================== TEXT EXTRACTION =====================

async function extractPDFPages(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str.trim())
      .filter((s: string) => s.length > 0)
      .join(' ');
    pages.push(normalizePDFText(text));
  }
  return pages;
}

async function extractTextFromImage(file: File): Promise<string> {
  const result = await Tesseract.recognize(file, 'eng');
  return normalizePDFText(result.data.text);
}

// ===================== HELPERS =====================

function extractStudentName(text: string): string {
  // "Report Card for: Last, First Page X" (footer pattern — most reliable)
  const footerMatch = text.match(/Report Card for:\s*(.+?)\s+Page/i);
  if (footerMatch) return footerMatch[1].trim();

  // "Student: Last, First [stop word]" (header pattern)
  // Stop at known CAS keywords that follow the student name
  const studentMatch = text.match(/Student:\s*(.+?)\s+(?:Grading|Academic|All Assessment|Report Card|Date|Grade \d)/i);
  if (studentMatch) return studentMatch[1].trim();

  // Last resort: just grab everything after "Student:" up to a reasonable boundary
  const fallback = text.match(/Student:\s*([^\n]+)/i);
  if (fallback) return fallback[1].trim();

  return 'Unknown Student';
}

export function extractGradeLevel(text: string): number {
  const match = text.match(/Grade\s+(\d+)\s+Report\s+Card/i);
  return match ? parseInt(match[1], 10) : 0;
}

function detectSemester(text: string): 1 | 2 {
  // Check how many grade values appear after each "Year <absent> <tardy>" pattern.
  // 1 value = Semester 1, 2-3 values = Semester 2.
  const gradePattern = /Year\s+\d+\s+\d+\s+([1-7P](?:\s+[1-7P]){0,2})/gi;
  const matches = [...text.matchAll(gradePattern)];

  let multi = 0;
  let single = 0;

  for (const m of matches) {
    const count = m[1].trim().split(/\s+/).length;
    if (count >= 2) multi++;
    else single++;
  }

  return multi > single ? 2 : 1;
}

function extractGradesFromText(text: string): number[] {
  // Universal CAS grades extractor:
  // Matches header starting with Absent Tardy... up to the last column name,
  // then captures absent count, tardy count, and all grade columns (any number of columns, not fixed to 3).
  const headerRegex = /Absent\s+Tard(?:y|ies)[\s\S]*?(?:Semester\s*\d|Sem\s*\d|Quarter\s*\d|Q\d|Term\s*\d|T\d|Year|Final|Exam)\s+(\d+)\s+(\d+)\s+([1-7P](?:\s+[1-7P])*)\s+Effort/gi;
  const matches = [...text.matchAll(headerRegex)];
  const grades: number[] = [];

  for (const m of matches) {
    const gradeValues = m[3].trim().split(/\s+/);
    const numeric = gradeValues.filter(g => g.toUpperCase() !== 'P').map(Number);
    if (numeric.length === 0) continue; // Skip pass/fail courses (e.g. IB Core)

    // If multiple grade columns exist (e.g. Sem 1, Sem 2, Year), pick Sem 2 (index 1)
    if (numeric.length >= 2) {
      grades.push(numeric[1]);
    } else {
      grades.push(numeric[0]);
    }
  }

  // Fallback: If header format differed slightly, anchor between attendance numbers and Effort
  if (grades.length === 0) {
    const fallbackRegex = /\b\d+\s+\d+\s+([1-7P](?:\s+[1-7P])*)\s+Effort/gi;
    for (const m of text.matchAll(fallbackRegex)) {
      const vals = m[1].trim().split(/\s+/).filter(g => g.toUpperCase() !== 'P').map(Number);
      if (vals.length > 0) {
        grades.push(vals.length >= 2 ? vals[1] : vals[0]);
      }
    }
  }

  return grades;
}

function checkAEorBE(text: string): boolean {
  // Strip out the legend/grading key if present in this student's section
  const cleaned = text.replace(/Grading\s+Key[\s\S]*?(?:Upper\s+School\s+Principal|Absent\s+Tardy)/gi, '');

  // Awarded marks are e.g. "Effort EE", "Conduct ME", "Personal Habits AE"
  // We use negative lookahead to ignore any legend definitions like "BE - Beginning" or "AE - Approaching"
  const regex = /(?:Effort|Conduct|Personal\s+Habits)\s+(AE|BE|ME|EE)(?!\s*-\s*[A-Za-z])/gi;
  const matches = [...cleaned.matchAll(regex)];

  if (matches.length > 0) {
    const awarded = matches.map(m => m[1].toUpperCase());
    return awarded.includes('AE') || awarded.includes('BE');
  }
  return false;
}

// ===================== ANALYSIS =====================

function analyzeStudentSection(section: string, minGrade: number): StudentResult | null {
  const studentName = extractStudentName(section);
  const gradeLevel = extractGradeLevel(section);

  // Skip if we can't identify the student at all
  if (studentName === 'Unknown Student' && gradeLevel === 0) return null;

  const grades = extractGradesFromText(section);
  const hasAEorBE = checkAEorBE(section);
  const has3OrLower = grades.some(g => g <= 3);

  let average = 0;
  if (grades.length > 0) {
    average = grades.reduce((a, b) => a + b, 0) / grades.length;
  }

  const failReasons: string[] = [];
  if (grades.length === 0) failReasons.push('No grades found');
  if (average < 5.8) failReasons.push(`Average ${average.toFixed(2)} < 5.8`);
  if (hasAEorBE) failReasons.push('Has AE or BE marks');
  if (has3OrLower) failReasons.push('Has grade of 3 or lower');
  if (gradeLevel > 0 && gradeLevel < minGrade) {
    failReasons.push(`Grade ${gradeLevel} is below minimum Grade ${minGrade} required`);
  }

  const isEligible = grades.length > 0 && average >= 5.8 && !hasAEorBE && !has3OrLower && (gradeLevel === 0 || gradeLevel >= minGrade);

  return {
    studentName,
    gradeLevel,
    average,
    hasAEorBE,
    has3OrLower,
    isEligible,
    grades,
    failReasons,
  };
}

function analyzeSingleStudent(text: string, fullText: string, studentName: string): ParseResult {
  const grades = extractGradesFromText(text);
  const hasAEorBE = checkAEorBE(text);
  const has3OrLower = grades.some(g => g <= 3);

  let average = 0;
  if (grades.length > 0) {
    average = grades.reduce((a, b) => a + b, 0) / grades.length;
  }

  const isEligible = grades.length > 0 && average >= 5.8 && !hasAEorBE && !has3OrLower;

  return { text, fullText, studentName, average, hasAEorBE, has3OrLower, isEligible, grades };
}
