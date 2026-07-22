import { APPS_SCRIPT_URL, SUBMIT_TOKEN } from '../config';
import type { EncodedFile } from './fileToBase64';

// ---------------------------------------------------------------------------
// Types (map 1:1 กับ schema Sheet ข้อ 4 เพื่อให้ migrate เข้า ATS ได้ง่าย)
// ---------------------------------------------------------------------------

export interface JourneyStep {
  order: number;
  title: string;
  description: string;
  icon?: string;
  durationWeeks?: number;
}

export interface Program {
  programId: string;
  name: string;
  description: string;
  journeySteps: JourneyStep[];
  eligibleFaculties: string[];
  quota: number | string;
  openDate: string;
  closeDate: string;
  journeyVideoUrl?: string;
  lottieJsonUrl?: string;
}

export interface ApplyPayload {
  programId: string;
  positionApplied: string;
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    lineUserId?: string;
  };
  education: {
    university: string;
    faculty: string;
    major: string;
    gpa: number | string;
    yearLevel: number | string;
    expectedGradYear: number | string;
  };
  consent: { accepted: boolean; version: string };
  files: {
    resume?: EncodedFile;
    transcript?: EncodedFile;
    portfolio?: EncodedFile[];
  };
}

export interface StatusHistoryItem {
  status: string;
  at: string;
  by: string;
  note?: string;
}

export interface Application {
  applicationId: string;
  candidateId: string;
  programId: string;
  trackingCode: string;
  positionApplied: string;
  assignedBranch: string;
  status: string;
  statusHistory: StatusHistoryItem[];
  reviewerNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchedRole {
  role: string;
  score: number;
}

export interface Candidate {
  candidateId: string;
  source: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  lineUserId: string;
  university: string;
  faculty: string;
  major: string;
  gpa: number | string;
  yearLevel: number | string;
  expectedGradYear: number | string;
  resumeUrl: string;
  resumeFileId: string;
  transcriptUrl: string;
  transcriptFileId: string;
  portfolio: { name: string; url: string; id: string }[];
  aiStatus: string;
  aiMatchScore: number | string;
  aiMatchedRoles: MatchedRole[];
  aiRecommendedBranch: string;
  aiSummary: string;
  aiFlags: string[];
  screenedAt: string;
  consentAccepted: boolean | string;
  consentVersion: string;
  consentAt: string;
  createdAt: string;
  updatedAt: string;
  application?: Application | null;
}

// สถานะตาม lifecycle (spec ข้อ 3)
export const MAIN_FLOW = [
  'submitted',
  'prescreened',
  'shortlisted',
  'interview',
  'offer',
  'accepted',
] as const;

export const TERMINAL_NEGATIVE = ['rejected', 'declined', 'failed'];

export const ALL_STATUSES = [
  ...MAIN_FLOW,
  'rejected',
  'declined',
] as const;

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

// ใช้ Content-Type: text/plain เพื่อเลี่ยง CORS preflight ของ Apps Script (gotcha สำคัญ ข้อ 3)
async function postAction(payload: unknown): Promise<any> {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function submitApplication(payload: ApplyPayload) {
  return postAction({ token: SUBMIT_TOKEN, action: 'apply', payload });
}

export async function fetchPrograms(): Promise<{ ok: boolean; programs?: Program[]; error?: string }> {
  const res = await fetch(APPS_SCRIPT_URL + '?action=programs');
  return res.json();
}

export async function trackStatus(trackingCode: string, email: string) {
  const url =
    APPS_SCRIPT_URL +
    '?action=track&trackingCode=' +
    encodeURIComponent(trackingCode) +
    '&email=' +
    encodeURIComponent(email);
  const res = await fetch(url);
  return res.json();
}

// --- admin (ADMIN_TOKEN ผู้ใช้กรอกในหน้า admin, เก็บใน localStorage เท่านั้น ไม่ commit) ---

export async function adminListCandidates(
  adminToken: string,
): Promise<{ ok: boolean; count?: number; candidates?: Candidate[]; error?: string }> {
  const res = await fetch(
    APPS_SCRIPT_URL + '?action=list&adminToken=' + encodeURIComponent(adminToken),
  );
  return res.json();
}

export async function adminGetCandidate(
  adminToken: string,
  candidateId: string,
): Promise<{ ok: boolean; candidate?: Candidate; applications?: Application[]; error?: string }> {
  const res = await fetch(
    APPS_SCRIPT_URL +
      '?action=candidate&adminToken=' +
      encodeURIComponent(adminToken) +
      '&candidateId=' +
      encodeURIComponent(candidateId),
  );
  return res.json();
}

export async function adminUpdateStatus(
  adminToken: string,
  payload: {
    trackingCode?: string;
    applicationId?: string;
    status: string;
    note?: string;
    assignedBranch?: string;
    reviewerNotes?: string;
    by?: string;
  },
) {
  return postAction({ adminToken, action: 'updateStatus', payload });
}

export async function adminRetryScreen(adminToken: string, candidateId: string) {
  return postAction({ adminToken, action: 'retryScreen', payload: { candidateId } });
}
