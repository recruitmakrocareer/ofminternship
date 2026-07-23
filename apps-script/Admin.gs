/**
 * Admin.gs — endpoint ฝั่งแอดมิน (token-protected) + mapper row -> object
 */

/** getCandidate — โปรไฟล์ผู้สมัคร + ใบสมัครที่เกี่ยวข้อง (สำหรับหน้า CandidateProfile) */
function getCandidate(candidateId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const row = findRow(ss.getSheetByName(TAB.CAND), CAND.candidateId, candidateId);
  if (!row) return { ok: false, error: 'not_found' };

  const apps = ss.getSheetByName(TAB.APP).getDataRange().getValues().slice(1)
    .filter(r => String(r[APP.candidateId - 1]) === String(candidateId))
    .map(rowToApplication);

  return { ok: true, candidate: rowToCandidate(row), applications: apps };
}

/**
 * getCandidatePhoto — คืนรูปถ่ายผู้สมัครเป็น base64 (สำหรับหน้า Admin แสดงรูป)
 * ไฟล์อยู่ใน Shared Drive (ไม่เปิดสาธารณะ) จึงส่งเป็น base64 ผ่าน endpoint ที่ต้องมี ADMIN_TOKEN
 * เพื่อความเป็นส่วนตัวตาม PDPA
 */
function getCandidatePhoto(candidateId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const row = findRow(ss.getSheetByName(TAB.CAND), CAND.candidateId, candidateId);
  if (!row) return { ok: false, error: 'not_found' };
  const form = safeParse(row[CAND.applicationFormJson - 1], {});
  const photo = form && form._files && form._files.photo;
  if (!photo || !photo.id) return { ok: false, error: 'no_photo' };
  try {
    const blob = DriveApp.getFileById(photo.id).getBlob();
    return { ok: true, mimeType: blob.getContentType(), dataBase64: Utilities.base64Encode(blob.getBytes()) };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/** listCandidates — รายการผู้สมัครทั้งหมด + สถานะใบสมัครล่าสุด (สำหรับ Dashboard) */
function listCandidates() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const cands = ss.getSheetByName(TAB.CAND).getDataRange().getValues().slice(1);
  const apps = ss.getSheetByName(TAB.APP).getDataRange().getValues().slice(1);

  const appByCand = {};
  apps.forEach(r => { if (r[APP.candidateId - 1]) appByCand[r[APP.candidateId - 1]] = r; });

  const list = cands.filter(r => r[CAND.candidateId - 1]).map(r => {
    const c = rowToCandidate(r);
    const a = appByCand[c.candidateId];
    c.application = a ? rowToApplication(a) : null;
    return c;
  });
  return { ok: true, count: list.length, candidates: list };
}

/**
 * updateApplicationStatus — แอดมินเปลี่ยนสถานะ (POST action=updateStatus)
 * payload = { trackingCode?|applicationId?, status, note?, by?, assignedBranch?, reviewerNotes? }
 */
function updateApplicationStatus(payload) {
  if (!payload || !payload.status) return { ok: false, error: 'missing_status' };
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB.APP);

  let row = -1;
  if (payload.applicationId) row = findRowIndex(sh, APP.applicationId, payload.applicationId);
  else if (payload.trackingCode) row = findRowIndex(sh, APP.trackingCode, payload.trackingCode);
  if (row < 2) return { ok: false, error: 'not_found' };

  const now = new Date();
  const history = safeParse(sh.getRange(row, APP.statusHistoryJson).getValue(), []);
  history.push({ status: payload.status, at: now, by: payload.by || 'admin', note: payload.note || '' });

  sh.getRange(row, APP.status).setValue(payload.status);
  sh.getRange(row, APP.statusHistoryJson).setValue(JSON.stringify(history));
  if (payload.assignedBranch !== undefined) sh.getRange(row, APP.assignedBranch).setValue(payload.assignedBranch);
  if (payload.reviewerNotes !== undefined) sh.getRange(row, APP.reviewerNotes).setValue(payload.reviewerNotes);
  sh.getRange(row, APP.updatedAt).setValue(now);

  return { ok: true, status: payload.status, statusHistory: history };
}

/**
 * setApplicationStatusByCandidate — เปลี่ยนสถานะจาก candidateId (ใช้โดย AI screening)
 */
function setApplicationStatusByCandidate(candidateId, status, by) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB.APP);
  const row = findRowIndex(sh, APP.candidateId, candidateId);
  if (row < 2) return;
  const now = new Date();
  const history = safeParse(sh.getRange(row, APP.statusHistoryJson).getValue(), []);
  history.push({ status: status, at: now, by: by || 'system', note: '' });
  sh.getRange(row, APP.status).setValue(status);
  sh.getRange(row, APP.statusHistoryJson).setValue(JSON.stringify(history));
  sh.getRange(row, APP.updatedAt).setValue(now);
}

/** rowToCandidate — map array (ตาม schema ข้อ 4) เป็น object */
function rowToCandidate(r) {
  return {
    candidateId: r[CAND.candidateId - 1],
    source: r[CAND.source - 1],
    firstName: r[CAND.firstName - 1],
    lastName: r[CAND.lastName - 1],
    email: r[CAND.email - 1],
    phone: r[CAND.phone - 1],
    lineUserId: r[CAND.lineUserId - 1],
    university: r[CAND.university - 1],
    faculty: r[CAND.faculty - 1],
    major: r[CAND.major - 1],
    gpa: r[CAND.gpa - 1],
    yearLevel: r[CAND.yearLevel - 1],
    expectedGradYear: r[CAND.expectedGradYear - 1],
    resumeUrl: r[CAND.resumeUrl - 1],
    resumeFileId: r[CAND.resumeFileId - 1],
    transcriptUrl: r[CAND.transcriptUrl - 1],
    transcriptFileId: r[CAND.transcriptFileId - 1],
    portfolio: safeParse(r[CAND.portfolioJson - 1], []),
    aiStatus: r[CAND.aiStatus - 1],
    aiMatchScore: r[CAND.aiMatchScore - 1],
    aiMatchedRoles: safeParse(r[CAND.aiMatchedRolesJson - 1], []),
    aiRecommendedBranch: r[CAND.aiRecommendedBranch - 1],
    aiSummary: r[CAND.aiSummary - 1],
    aiFlags: safeParse(r[CAND.aiFlagsJson - 1], []),
    screenedAt: r[CAND.screenedAt - 1],
    consentAccepted: r[CAND.consentAccepted - 1],
    consentVersion: r[CAND.consentVersion - 1],
    consentAt: r[CAND.consentAt - 1],
    createdAt: r[CAND.createdAt - 1],
    updatedAt: r[CAND.updatedAt - 1],
    applicationForm: safeParse(r[CAND.applicationFormJson - 1], {}),
  };
}

/** rowToApplication — map array (ตาม schema ข้อ 4) เป็น object */
function rowToApplication(r) {
  return {
    applicationId: r[APP.applicationId - 1],
    candidateId: r[APP.candidateId - 1],
    programId: r[APP.programId - 1],
    trackingCode: r[APP.trackingCode - 1],
    positionApplied: r[APP.positionApplied - 1],
    assignedBranch: r[APP.assignedBranch - 1],
    status: r[APP.status - 1],
    statusHistory: safeParse(r[APP.statusHistoryJson - 1], []),
    reviewerNotes: r[APP.reviewerNotes - 1],
    createdAt: r[APP.createdAt - 1],
    updatedAt: r[APP.updatedAt - 1],
  };
}
