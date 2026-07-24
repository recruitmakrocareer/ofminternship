/**
 * Maintenance.gs — งานดูแลข้อมูลตามรอบ (Data Retention ตาม PDPA)
 * -----------------------------------------------------------------------------
 * ตั้ง time-driven trigger: Triggers → Add Trigger → runRetention → Time-driven → รายเดือน
 *
 * runRetention: ย้ายโฟลเดอร์ Drive ของผู้สมัครที่ "ไม่ผ่าน/ปฏิเสธ" และเก่ากว่า
 *   RETENTION_MONTHS เดือน (default 12) ไปไว้ใน _archive/ เพื่อลดการเก็บข้อมูลเกินจำเป็น
 */

function runRetention() {
  const months = parseInt(PROPS.getProperty('RETENTION_MONTHS') || '12', 10);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const apps = ss.getSheetByName(TAB.APP).getDataRange().getValues().slice(1);
  const candSheet = ss.getSheetByName(TAB.CAND);
  const candRows = candSheet.getDataRange().getValues().slice(1);

  const archive = getArchiveFolder();
  let moved = 0;

  apps.forEach((a) => {
    const status = String(a[APP.status - 1]);
    const updatedAt = a[APP.updatedAt - 1];
    const isOld = updatedAt instanceof Date ? updatedAt < cutoff : new Date(updatedAt) < cutoff;
    if ((status === 'rejected' || status === 'declined') && isOld) {
      const candidateId = a[APP.candidateId - 1];
      const cand = candRows.find((r) => r[CAND.candidateId - 1] === candidateId);
      if (!cand) return;
      // หา folder ของผู้สมัครจากไฟล์ที่แนบ (resume/photo/transcript) แล้วย้ายไป _archive
      const fileId = cand[CAND.resumeFileId - 1] || cand[CAND.transcriptFileId - 1];
      if (!fileId || !archive) return;
      try {
        const parents = DriveApp.getFileById(fileId).getParents();
        if (parents.hasNext()) {
          const folder = parents.next();
          folder.moveTo(archive);
          moved++;
        }
      } catch (e) {
        /* ข้ามไฟล์ที่หาไม่เจอ/ถูกลบไปแล้ว */
      }
    }
  });

  return moved;
}

/** getArchiveFolder — คืน (หรือสร้าง) โฟลเดอร์ _archive ข้าง ๆ applicants/ ใน Shared Drive */
function getArchiveFolder() {
  const applicants = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const parents = applicants.getParents();
  if (!parents.hasNext()) return null;
  const root = parents.next();
  const existing = root.getFoldersByName('_archive');
  return existing.hasNext() ? existing.next() : root.createFolder('_archive');
}
