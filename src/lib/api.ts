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
    photo?: EncodedFile;
    resume?: EncodedFile;
    transcript?: EncodedFile;
    coopLetter?: EncodedFile;
    portfolio?: EncodedFile[];
  };
  // แบบฟอร์มทางการฉบับเต็ม (49 คำถาม) — backend เก็บเป็น JSON คอลัมน์เดียว applicationFormJson
  form?: Record<string, unknown>;
  // token จาก Cloudflare Turnstile (ถ้าเปิดใช้ spam protection)
  turnstileToken?: string;
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
  applicationForm?: Record<string, any>;
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

// Apps Script /exec จะ 302 ไป script.googleusercontent.com/macros/echo เสมอ
// ถ้าปลายทางตอบ 404/5xx (deployment ถูกแทนที่ / "Who has access" ไม่ใช่ Anyone /
// payload ใหญ่เกิน limit / โควตาหมด) เราจะได้ HTML กลับมาแทน JSON แล้ว res.json()
// จะ throw "Unexpected token '<'" ทำให้หน้าจอว่างเปล่าและ debug ยาก
// -> อ่านเป็น text ก่อนแล้วค่อย parse เพื่อคืน error ที่สื่อความหมาย
async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: res.ok ? 'backend_bad_response' : `backend_http_${res.status}` };
  }
}

async function getJson(query: string): Promise<any> {
  try {
    return await readJson(await fetch(APPS_SCRIPT_URL + query));
  } catch {
    return { ok: false, error: 'network' };
  }
}

// ใช้ Content-Type: text/plain เพื่อเลี่ยง CORS preflight ของ Apps Script (gotcha สำคัญ ข้อ 3)
async function postAction(payload: unknown): Promise<any> {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    return await readJson(res);
  } catch {
    return { ok: false, error: 'network' };
  }
}

/** แปลงรหัส error เป็นข้อความภาษาไทยสำหรับแสดงในหน้า admin */
export function apiErrorMessage(error?: string): string {
  if (!error) return 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ';
  if (error === 'unauthorized') return 'Admin token ไม่ถูกต้อง';
  if (error === 'not_found') return 'ไม่พบข้อมูล';
  if (error === 'network') return 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ต';
  if (error.startsWith('backend_http_'))
    return (
      `เซิร์ฟเวอร์ตอบกลับผิดพลาด (HTTP ${error.replace('backend_http_', '')}) — ` +
      'ตรวจสอบว่า Apps Script ยัง Deploy อยู่ และตั้ง Who has access = Anyone'
    );
  if (error === 'backend_bad_response')
    return 'เซิร์ฟเวอร์ตอบกลับไม่ใช่ JSON — มักเกิดจาก deployment ถูกแทนที่ หรือข้อมูลตอบกลับใหญ่เกินไป';
  return error;
}

export async function submitApplication(payload: ApplyPayload) {
  return postAction({ token: SUBMIT_TOKEN, action: 'apply', payload });
}

export async function fetchPrograms(): Promise<{ ok: boolean; programs?: Program[]; error?: string }> {
  return getJson('?action=programs');
}

export async function trackStatus(trackingCode: string, email: string) {
  return getJson(
    '?action=track&trackingCode=' +
      encodeURIComponent(trackingCode) +
      '&email=' +
      encodeURIComponent(email),
  );
}

// --- admin (ADMIN_TOKEN ผู้ใช้กรอกในหน้า admin, เก็บใน localStorage เท่านั้น ไม่ commit) ---

/**
 * adminListCandidates — รายชื่อผู้สมัครทั้งหมด
 * lite = true คืนเฉพาะ candidateId + สถานะ (ใช้ทำปุ่มก่อนหน้า/ถัดไป) — response เล็กกว่ามาก
 * เพราะไม่ดึง applicationFormJson ของทุกคนมาด้วย (backend เก่าที่ยังไม่รู้จัก lite
 * จะคืนรายการเต็มตามเดิม ซึ่งยังใช้งานได้ปกติ)
 */
export async function adminListCandidates(
  adminToken: string,
  opts: { lite?: boolean } = {},
): Promise<{ ok: boolean; count?: number; candidates?: Candidate[]; error?: string }> {
  return getJson(
    '?action=list&adminToken=' + encodeURIComponent(adminToken) + (opts.lite ? '&lite=1' : ''),
  );
}

export async function adminGetCandidate(
  adminToken: string,
  candidateId: string,
): Promise<{ ok: boolean; candidate?: Candidate; applications?: Application[]; error?: string }> {
  return getJson(
    '?action=candidate&adminToken=' +
      encodeURIComponent(adminToken) +
      '&candidateId=' +
      encodeURIComponent(candidateId),
  );
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

// ดึงรูปถ่ายผู้สมัครเป็น base64 (ไฟล์อยู่ใน Shared Drive ไม่เปิดสาธารณะ) แล้วประกอบเป็น data URI
export async function adminGetPhoto(
  adminToken: string,
  candidateId: string,
): Promise<{ ok: boolean; mimeType?: string; dataBase64?: string; error?: string }> {
  return getJson(
    '?action=photo&adminToken=' +
      encodeURIComponent(adminToken) +
      '&candidateId=' +
      encodeURIComponent(candidateId),
  );
}
