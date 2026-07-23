// สถานะจริงใน backend (lifecycle) ↔ label + สี badge ตามดีไซน์
// submitted/prescreened = cyan, shortlisted = gold, interview/offer = red, accepted = green, rejected/declined/failed = grey

export const STATUS_LABELS: Record<string, string> = {
  submitted: 'ส่งใบสมัคร',
  screening: 'กำลังคัดกรอง',
  prescreened: 'คัดเลือกใบสมัคร',
  shortlisted: 'Shortlist',
  interview: 'นัดสัมภาษณ์',
  offer: 'ได้รับข้อเสนอ',
  accepted: 'รับเข้า',
  rejected: 'ไม่ผ่าน',
  declined: 'ปฏิเสธข้อเสนอ',
  failed: 'คัดกรองไม่สำเร็จ',
};

export function statusLabel(s: string): string {
  return STATUS_LABELS[s] || s || '—';
}

export function badgeStyle(s: string): { background: string; color: string } {
  const cyan = { background: 'rgba(63,197,240,.15)', color: '#3FC5F0' };
  const gold = { background: 'rgba(255,196,46,.15)', color: '#FFC42E' };
  const red = { background: 'rgba(226,35,26,.15)', color: '#FF7A70' };
  const green = { background: 'rgba(79,208,138,.15)', color: '#4FD08A' };
  const grey = { background: 'rgba(120,141,176,.15)', color: '#8A97B8' };
  switch (s) {
    case 'submitted':
    case 'screening':
    case 'prescreened':
      return cyan;
    case 'shortlisted':
      return gold;
    case 'interview':
    case 'offer':
      return red;
    case 'accepted':
      return green;
    default:
      return grey;
  }
}

// ปุ่มเปลี่ยนสถานะฝั่งแอดมิน (map ค่าจริงใน backend)
export const STATUS_ACTIONS: { status: string; label: string; variant?: 'green' | 'red' }[] = [
  { status: 'prescreened', label: 'คัดเลือกใบสมัคร' },
  { status: 'shortlisted', label: 'Shortlist' },
  { status: 'interview', label: 'นัดสัมภาษณ์' },
  { status: 'accepted', label: 'รับเข้า', variant: 'green' },
  { status: 'rejected', label: 'ไม่ผ่าน', variant: 'red' },
];

// stepper ฝั่งผู้สมัคร (4 ขั้น) — map สถานะจริงเป็น index
export const TRACK_STEPS = ['ส่งใบสมัคร', 'คัดเลือกใบสมัคร', 'นัดสัมภาษณ์', 'ผลการพิจารณา'];

export function trackStepIndex(status: string): number {
  switch (status) {
    case 'submitted':
      return 0;
    case 'prescreened':
    case 'shortlisted':
    case 'screening':
      return 1;
    case 'interview':
    case 'offer':
      return 2;
    case 'accepted':
    case 'rejected':
    case 'declined':
      return 3;
    default:
      return 0;
  }
}

export function isNegative(status: string): boolean {
  return status === 'rejected' || status === 'declined' || status === 'failed';
}
