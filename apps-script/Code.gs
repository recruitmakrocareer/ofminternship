/**
 * Code.gs — Router หลักของ Apps Script Web App
 * -----------------------------------------------------------------------------
 * รับ request จาก React SPA (GitHub Pages) ผ่าน doPost / doGet
 * อ่านค่า config ทั้งหมดจาก Script Properties (ห้าม hardcode secret)
 *
 * ตั้งค่าที่ Project Settings → Script Properties:
 *   SHEET_ID         - id ของ Spreadsheet ที่มี 3 แท็บ Candidates/Applications/Programs
 *   DRIVE_FOLDER_ID  - id ของโฟลเดอร์ applicants/ ใน Shared Drive
 *   SUBMIT_TOKEN     - token สำหรับฟอร์มสาธารณะ (กัน spam พื้นฐาน)
 *   ADMIN_TOKEN      - token สำหรับ endpoint ฝั่งแอดมิน (ดูโปรไฟล์/รายการ/เปลี่ยนสถานะ)
 *   GEMINI_API_KEY   - API key จาก Google AI Studio
 *   GEMINI_MODEL     - (ไม่บังคับ) ชื่อ model เช่น gemini-2.5-flash
 */

const PROPS = PropertiesService.getScriptProperties();
const SHEET_ID = PROPS.getProperty('SHEET_ID');
const DRIVE_FOLDER_ID = PROPS.getProperty('DRIVE_FOLDER_ID'); // โฟลเดอร์ applicants/ ใน Shared Drive
const SUBMIT_TOKEN = PROPS.getProperty('SUBMIT_TOKEN');
const ADMIN_TOKEN = PROPS.getProperty('ADMIN_TOKEN');
const GEMINI_API_KEY = PROPS.getProperty('GEMINI_API_KEY');
const GEMINI_MODEL = PROPS.getProperty('GEMINI_MODEL') || 'gemini-2.5-flash';

/** ชื่อแท็บใน Spreadsheet */
const TAB = { CAND: 'Candidates', APP: 'Applications', PROG: 'Programs' };

/**
 * ตำแหน่งคอลัมน์ (1-based) ตาม schema ข้อ 4 ของ spec
 * ใช้ร่วมกันได้ทุกไฟล์เพราะ Apps Script แชร์ global scope
 */
const CAND = {
  candidateId: 1, source: 2, firstName: 3, lastName: 4, email: 5, phone: 6,
  lineUserId: 7, university: 8, faculty: 9, major: 10, gpa: 11, yearLevel: 12,
  expectedGradYear: 13, resumeUrl: 14, resumeFileId: 15, transcriptUrl: 16,
  transcriptFileId: 17, portfolioJson: 18, aiStatus: 19, aiMatchScore: 20,
  aiMatchedRolesJson: 21, aiRecommendedBranch: 22, aiSummary: 23, aiFlagsJson: 24,
  screenedAt: 25, consentAccepted: 26, consentVersion: 27, consentAt: 28,
  createdAt: 29, updatedAt: 30, applicationFormJson: 31,
};
const APP = {
  applicationId: 1, candidateId: 2, programId: 3, trackingCode: 4,
  positionApplied: 5, assignedBranch: 6, status: 7, statusHistoryJson: 8,
  reviewerNotes: 9, createdAt: 10, updatedAt: 11,
};

/**
 * doPost — endpoint หลักสำหรับ action ที่เปลี่ยนแปลงข้อมูล
 * frontend ต้องส่ง Content-Type: text/plain เพื่อเลี่ยง CORS preflight (ดู gotcha ข้อ 3)
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    switch (body.action) {
      case 'apply':
        if (body.token !== SUBMIT_TOKEN) return json({ ok: false, error: 'unauthorized' });
        return json(handleApply(body.payload));

      case 'updateStatus': // แอดมินเปลี่ยนสถานะใบสมัคร
        if (body.adminToken !== ADMIN_TOKEN) return json({ ok: false, error: 'unauthorized' });
        return json(updateApplicationStatus(body.payload));

      case 'retryScreen': // แอดมันสั่ง re-run AI screening
        if (body.adminToken !== ADMIN_TOKEN) return json({ ok: false, error: 'unauthorized' });
        return json(retryScreen(body.payload));

      default:
        return json({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/**
 * doGet — endpoint สำหรับอ่านข้อมูล (programs / track / admin read)
 */
function doGet(e) {
  try {
    const p = e.parameter;
    if (p.action === 'programs') return json({ ok: true, programs: listPrograms() });
    if (p.action === 'track') return json(handleTrack(p.trackingCode, p.email));
    if (p.action === 'candidate' && p.adminToken === ADMIN_TOKEN) return json(getCandidate(p.candidateId));
    if (p.action === 'photo' && p.adminToken === ADMIN_TOKEN) return json(getCandidatePhoto(p.candidateId));
    if (p.action === 'list' && p.adminToken === ADMIN_TOKEN) return json(listCandidates());
    return json({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** ห่อ response เป็น JSON (Apps Script ไม่ตั้ง CORS header เอง — ใช้ text/plain ฝั่ง client แทน) */
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** JSON.parse แบบปลอดภัย — คืน fallback ถ้า parse ไม่ได้ */
function safeParse(str, fallback) {
  try { return JSON.parse(str); } catch (e) { return fallback; }
}
