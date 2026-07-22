/**
 * Track.gs — ติดตามสถานะใบสมัคร (public) + list programs + helper ค้นแถว
 */

/**
 * handleTrack — ผู้สมัครดูสถานะด้วย trackingCode + email
 * บังคับ email ตรงกับ candidate เพื่อกันคนอื่นเปิดดูสถานะ (ข้อ 9)
 */
function handleTrack(trackingCode, email) {
  if (!trackingCode || !email) return { ok: false, error: 'missing_params' };
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const app = findRow(ss.getSheetByName(TAB.APP), APP.trackingCode, trackingCode);
  if (!app) return { ok: false, error: 'not_found' };

  const cand = findRow(ss.getSheetByName(TAB.CAND), CAND.candidateId, app[APP.candidateId - 1]);
  if (!cand || String(cand[CAND.email - 1]).toLowerCase().trim() !== String(email).toLowerCase().trim()) {
    return { ok: false, error: 'email_mismatch' }; // กันคนอื่นดูสถานะ
  }

  return {
    ok: true,
    trackingCode: trackingCode,
    status: app[APP.status - 1],
    positionApplied: app[APP.positionApplied - 1],
    assignedBranch: app[APP.assignedBranch - 1],
    statusHistory: safeParse(app[APP.statusHistoryJson - 1], []),
    applicant: {
      firstName: cand[CAND.firstName - 1],
      lastName: cand[CAND.lastName - 1],
    },
  };
}

/** listPrograms — คืนเฉพาะโครงการที่ isActive = TRUE */
function listPrograms() {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB.PROG);
  return sh.getDataRange().getValues().slice(1)
    .filter(r => r[0] && (r[8] === true || String(r[8]).toUpperCase() === 'TRUE'))
    .map(r => ({
      programId: r[0],
      name: r[1],
      description: r[2],
      journeySteps: safeParse(r[3], []),
      eligibleFaculties: safeParse(r[4], []),
      quota: r[5],
      openDate: r[6],
      closeDate: r[7],
      journeyVideoUrl: r[9],
      lottieJsonUrl: r[10],
    }));
}

/**
 * findRow — คืน "array ของแถว" แรกที่ค่าในคอลัมน์ col (1-based) ตรงกับ value
 * (อ่านทั้ง sheet ครั้งเดียว — เหมาะกับ pilot หลักร้อย-พันแถว)
 */
function findRow(sheet, col, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col - 1]) === String(value)) return data[i];
  }
  return null;
}

/** findRowIndex — คืน "หมายเลขแถว" (1-based) หรือ -1 ถ้าไม่พบ */
function findRowIndex(sheet, col, value) {
  const data = sheet.getRange(1, col, sheet.getLastRow(), 1).getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(value)) return i + 1;
  }
  return -1;
}
