/**
 * Seed.gs — helper สำหรับ P1 (Setup) รันครั้งเดียวจาก Apps Script editor
 * -----------------------------------------------------------------------------
 * setupSheets()  : สร้าง header ครบ 3 แท็บตาม schema ข้อ 4 (ถ้ายังไม่มี)
 * seedProgram()  : ใส่ตัวอย่างโครงการ 1 รายการให้ frontend ดึงไปทดสอบได้
 *
 * วิธีใช้: เปิด editor → เลือกฟังก์ชัน → Run (ต้อง set SHEET_ID ใน Script Properties ก่อน)
 */

function setupSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const headers = {
    Candidates: [
      'candidateId', 'source', 'firstName', 'lastName', 'email', 'phone', 'lineUserId',
      'university', 'faculty', 'major', 'gpa', 'yearLevel', 'expectedGradYear',
      'resumeUrl', 'resumeFileId', 'transcriptUrl', 'transcriptFileId', 'portfolioJson',
      'aiStatus', 'aiMatchScore', 'aiMatchedRolesJson', 'aiRecommendedBranch', 'aiSummary',
      'aiFlagsJson', 'screenedAt', 'consentAccepted', 'consentVersion', 'consentAt',
      'createdAt', 'updatedAt',
    ],
    Applications: [
      'applicationId', 'candidateId', 'programId', 'trackingCode', 'positionApplied',
      'assignedBranch', 'status', 'statusHistoryJson', 'reviewerNotes', 'createdAt', 'updatedAt',
    ],
    Programs: [
      'programId', 'name', 'description', 'journeyStepsJson', 'eligibleFacultiesJson',
      'quota', 'openDate', 'closeDate', 'isActive', 'journeyVideoUrl', 'lottieJsonUrl',
    ],
  };

  Object.keys(headers).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const cols = headers[name];
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
}

function seedProgram() {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB.PROG);
  const journeySteps = [
    { order: 1, title: 'สมัคร', description: 'กรอกฟอร์ม + แนบ Resume/Transcript', icon: 'edit', durationWeeks: 0 },
    { order: 2, title: 'คัดกรองด้วย AI', description: 'ระบบประเมินความเหมาะสมอัตโนมัติ', icon: 'cpu', durationWeeks: 1 },
    { order: 3, title: 'สัมภาษณ์', description: 'พูดคุยกับทีม Talent Acquisition', icon: 'users', durationWeeks: 2 },
    { order: 4, title: 'ฝึกงาน', description: 'ลงมือทำงานจริงกับทีม Operations', icon: 'briefcase', durationWeeks: 12 },
    { order: 5, title: 'จบโครงการ', description: 'ประเมินผล + โอกาสร่วมงานต่อ', icon: 'award', durationWeeks: 0 },
  ];
  sh.appendRow([
    'PROG-OPS-2026', 'Operations Internship 2026',
    'โครงการฝึกงานสายปฏิบัติการกับ CP AXTRA (Makro) เรียนรู้งานจริงในธุรกิจค้าส่งค้าปลีก',
    JSON.stringify(journeySteps),
    JSON.stringify(['บริหารธุรกิจ', 'วิศวกรรมศาสตร์', 'โลจิสติกส์', 'วิทยาการคอมพิวเตอร์']),
    20, '2026-01-01', '2026-12-31', true, '', '',
  ]);
}
