/**
 * AiScreen.gs — Gemini อ่าน PDF Resume + pre-screening ในครั้งเดียว
 * -----------------------------------------------------------------------------
 * NOTE: ตรวจชื่อ model ล่าสุดก่อน deploy (GEMINI_MODEL ใน Script Properties)
 *       ปัจจุบัน default = gemini-2.5-flash (multimodal, free tier)
 */

function runAiScreen(candidateId, resume, payload) {
  if (!resume || !resume.id) {
    // ไม่มี resume ให้อ่าน — mark ว่า skip เพื่อไม่ให้ค้างที่ pending
    updateCandidateAiStatus(candidateId, 'failed');
    return;
  }
  if (!GEMINI_API_KEY) {
    updateCandidateAiStatus(candidateId, 'failed');
    throw new Error('GEMINI_API_KEY not set');
  }

  updateCandidateAiStatus(candidateId, 'processing');

  const blob = DriveApp.getFileById(resume.id).getBlob();
  const b64 = Utilities.base64Encode(blob.getBytes());

  const edu = (payload && payload.education) || {};
  const prompt =
    'คุณคือผู้ช่วย HR pre-screening ของ CP AXTRA (Makro). อ่าน Resume ที่แนบ (OCR) ' +
    'แล้วประเมินความเหมาะสมกับตำแหน่งฝึกงาน Operations. ' +
    'ข้อมูลผู้สมัคร: คณะ=' + (edu.faculty || '-') + ', สาขา=' + (edu.major || '-') +
    ', GPA=' + (edu.gpa || '-') + '. ' +
    'ตอบกลับเป็น JSON เท่านั้น: {"matchScore": number(0-100), ' +
    '"matchedRoles":[{"role":string,"score":number}], "recommendedBranch": string, ' +
    '"summary": string(<=3 บรรทัด), "flags":[string]}';

  const req = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: 'application/pdf', data: b64 } },
      ],
    }],
    generationConfig: { responseMimeType: 'application/json' },
  };

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    GEMINI_MODEL + ':generateContent?key=' + GEMINI_API_KEY;

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(req),
    muteHttpExceptions: true,
  });

  if (res.getResponseCode() >= 300) {
    updateCandidateAiStatus(candidateId, 'failed');
    throw new Error('Gemini HTTP ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 500));
  }

  const data = JSON.parse(res.getContentText());
  const text = data && data.candidates && data.candidates[0] &&
    data.candidates[0].content.parts[0].text;
  if (!text) {
    updateCandidateAiStatus(candidateId, 'failed');
    throw new Error('Gemini: empty response');
  }
  const ai = JSON.parse(text);

  updateCandidateAi(candidateId, ai);
  setApplicationStatusByCandidate(candidateId, 'prescreened', 'ai');
}

/** เขียนผล AI ลงคอลัมน์ S..Y (aiStatus..screenedAt) */
function updateCandidateAi(candidateId, ai) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB.CAND);
  const row = findRowIndex(sh, CAND.candidateId, candidateId);
  if (row < 2) return;
  // S=aiStatus(19) T=matchScore(20) U=matchedRoles(21) V=branch(22) W=summary(23) X=flags(24) Y=screenedAt(25)
  sh.getRange(row, CAND.aiStatus, 1, 7).setValues([[
    'done',
    typeof ai.matchScore === 'number' ? ai.matchScore : '',
    JSON.stringify(ai.matchedRoles || []),
    ai.recommendedBranch || '',
    ai.summary || '',
    JSON.stringify(ai.flags || []),
    new Date(),
  ]]);
  touchCandidate(row);
}

/** อัปเดตเฉพาะ aiStatus (pending/processing/done/failed) */
function updateCandidateAiStatus(candidateId, status) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB.CAND);
  const row = findRowIndex(sh, CAND.candidateId, candidateId);
  if (row < 2) return;
  sh.getRange(row, CAND.aiStatus).setValue(status);
  touchCandidate(row);
}

/** อัปเดต updatedAt ของ candidate */
function touchCandidate(row) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB.CAND);
  sh.getRange(row, CAND.updatedAt).setValue(new Date());
}

/**
 * retryScreen — แอดมินสั่งรัน AI ใหม่ (สร้าง payload ย่อจากข้อมูลใน row)
 * payload = { candidateId }
 */
function retryScreen(payload) {
  const candidateId = payload && payload.candidateId;
  if (!candidateId) return { ok: false, error: 'missing_candidateId' };
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB.CAND);
  const row = findRowIndex(sh, CAND.candidateId, candidateId);
  if (row < 2) return { ok: false, error: 'not_found' };
  const values = sh.getRange(row, 1, 1, CAND.updatedAt).getValues()[0];
  const resume = { id: values[CAND.resumeFileId - 1], url: values[CAND.resumeUrl - 1] };
  const fakePayload = {
    education: {
      faculty: values[CAND.faculty - 1],
      major: values[CAND.major - 1],
      gpa: values[CAND.gpa - 1],
    },
  };
  try {
    runAiScreen(candidateId, resume, fakePayload);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * screenPendingBatch — สำหรับ time-driven trigger (gotcha ข้อ 1)
 * สแกน candidate ที่ aiStatus = pending/failed แล้วรันทีละ row เป็น batch
 * ตั้ง trigger: Triggers → Add Trigger → screenPendingBatch → Time-driven → ทุก 5 นาที
 */
function screenPendingBatch() {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB.CAND);
  const data = sh.getDataRange().getValues();
  const MAX_PER_RUN = 5; // กันชน execution time limit
  let done = 0;
  for (let i = 1; i < data.length && done < MAX_PER_RUN; i++) {
    const st = data[i][CAND.aiStatus - 1];
    if (st === 'pending' || st === 'failed') {
      const candidateId = data[i][CAND.candidateId - 1];
      const resume = {
        id: data[i][CAND.resumeFileId - 1],
        url: data[i][CAND.resumeUrl - 1],
      };
      const fakePayload = {
        education: {
          faculty: data[i][CAND.faculty - 1],
          major: data[i][CAND.major - 1],
          gpa: data[i][CAND.gpa - 1],
        },
      };
      try { runAiScreen(candidateId, resume, fakePayload); } catch (e) { /* ข้าม row ที่ error */ }
      done++;
    }
  }
  return done;
}
