/**
 * Apply.gs — สร้าง Candidate + Application + เซฟไฟล์ลง Drive
 * -----------------------------------------------------------------------------
 * ใช้ LockService กัน race condition ตอนหลายคนสมัครพร้อมกัน
 */

function handleApply(payload) {
  // validate input เบื้องต้นก่อนล็อก
  const errValidate = validateApplyPayload(payload);
  if (errValidate) return { ok: false, error: errValidate };

  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // กัน race condition ตอนหลายคนสมัครพร้อมกัน
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const candSheet = ss.getSheetByName(TAB.CAND);
    const appSheet = ss.getSheetByName(TAB.APP);
    const now = new Date();
    const candidateId = 'C' + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
    const applicationId = 'A' + Utilities.getUuid().replace(/-/g, '').slice(0, 8);

    // 1) เซฟไฟล์ลง Drive — ตั้งชื่อโฟลเดอร์เป็น "วันที่สมัคร_ชื่อ นามสกุล_candidateId"
    //    ต่อ candidateId ท้ายไว้กันชื่อซ้ำ (คนชื่อเดียวกันสมัครวันเดียวกัน) + ให้ map กลับไปหาแถวใน Sheet ได้
    //    ถ้าไม่อยากได้ candidateId ท้ายชื่อ ให้ลบ ' + '_' + candidateId ' ออก
    const parent = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const safeName = (payload.personal.firstName + ' ' + payload.personal.lastName)
      .replace(/[\/\\:*?"<>|]/g, '-') // ตัดอักขระที่ใช้ในชื่อไฟล์/โฟลเดอร์ไม่ได้
      .replace(/\s+/g, ' ')
      .trim();
    const folderName = dateStr + '_' + safeName + '_' + candidateId;
    const folder = parent.createFolder(folderName);
    const files = payload.files || {};
    const resume = files.resume ? saveFile(folder, files.resume, 'resume') : {};
    const transcript = files.transcript ? saveFile(folder, files.transcript, 'transcript') : {};
    const coopLetter = files.coopLetter ? saveFile(folder, files.coopLetter, 'coop_letter') : {};
    const portfolio = (files.portfolio || []).map((f, i) => saveFile(folder, f, 'portfolio_' + i));

    // แบบฟอร์มทางการฉบับเต็ม (49 คำถาม) เก็บเป็น JSON คอลัมน์เดียว (col AE = 31)
    // ฝังลิงก์ไฟล์ทั้งหมดไว้ใน JSON ด้วย เผื่ออ้างอิงไฟล์ที่ไม่มีคอลัมน์เฉพาะ (เช่น หนังสือขอความอนุเคราะห์)
    const formData = payload.form || {};
    formData._files = { resume: resume, transcript: transcript, coopLetter: coopLetter, portfolio: portfolio };

    // 2) Tracking code — ใช้ counter ใน Script Properties กัน tracking code ซ้ำ/ข้าม
    //    (แม่นกว่า getLastRow() ตอน concurrency สูง)
    const seq = nextSequence();
    const trackingCode = 'MKR-INT-2026-' + String(seq).padStart(4, '0');

    // 3) เขียน Candidate row (เรียงตาม schema ข้อ 4 เป๊ะ ๆ)
    candSheet.appendRow([
      candidateId, 'internship_portal',
      payload.personal.firstName, payload.personal.lastName, payload.personal.email,
      payload.personal.phone, payload.personal.lineUserId || '',
      payload.education.university, payload.education.faculty, payload.education.major,
      payload.education.gpa, payload.education.yearLevel, payload.education.expectedGradYear,
      resume.url || '', resume.id || '', transcript.url || '', transcript.id || '',
      JSON.stringify(portfolio),
      'pending', '', '', '', '', '', '',           // AI fields S..Y (เติมทีหลังใน runAiScreen)
      !!payload.consent.accepted, payload.consent.version || '', now,
      now, now,
      JSON.stringify(formData),                     // AE (31) = applicationFormJson
    ]);

    // 4) เขียน Application row
    appSheet.appendRow([
      applicationId, candidateId, payload.programId, trackingCode,
      payload.positionApplied || '', '',
      'submitted', JSON.stringify([{ status: 'submitted', at: now, by: 'system' }]), '',
      now, now,
    ]);

    lock.releaseLock();

    // 5) เรียก AI screening ใน execution เดียว — ถ้าช้าเกิน (>6 นาที) ให้พึ่ง batch trigger แทน
    //    ห่อ try/catch เพื่อไม่ให้ AI error ทำให้การสมัครล้ม (row aiStatus จะค้างที่ pending/failed แล้ว retry ได้)
    try {
      runAiScreen(candidateId, resume, payload);
    } catch (aiErr) {
      try { updateCandidateAiStatus(candidateId, 'failed'); } catch (ignore) {}
    }

    return { ok: true, trackingCode: trackingCode, candidateId: candidateId };
  } catch (err) {
    if (lock.hasLock()) lock.releaseLock();
    return { ok: false, error: String(err) };
  }
}

/** ตรวจ payload เบื้องต้น — คืน string error หรือ null ถ้าผ่าน */
function validateApplyPayload(payload) {
  if (!payload) return 'missing_payload';
  if (!payload.personal || !payload.personal.firstName || !payload.personal.email) return 'missing_personal';
  if (!payload.education || !payload.education.university) return 'missing_education';
  if (!payload.programId) return 'missing_program';
  if (!payload.consent || !payload.consent.accepted) return 'consent_required';
  return null;
}

/**
 * saveFile — เขียน blob ลงโฟลเดอร์ผู้สมัคร
 * fileObj = { name, mimeType, dataBase64 } (frontend เข้ารหัส base64 มาแล้ว)
 */
function saveFile(folder, fileObj, prefix) {
  const bytes = Utilities.base64Decode(fileObj.dataBase64);
  const blob = Utilities.newBlob(bytes, fileObj.mimeType, prefix + '_' + fileObj.name);
  const file = folder.createFile(blob);
  return { id: file.getId(), url: file.getUrl(), name: fileObj.name };
}

/**
 * nextSequence — running number ที่ atomic (อยู่ใต้ LockService ที่ handleApply ถืออยู่แล้ว)
 * เก็บใน Script Properties เพื่อไม่ให้ tracking code ซ้ำแม้ลบแถวใน Sheet
 */
function nextSequence() {
  const key = 'APP_SEQ';
  const current = parseInt(PROPS.getProperty(key) || '0', 10);
  const next = current + 1;
  PROPS.setProperty(key, String(next));
  return next;
}
