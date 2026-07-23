import { MAIN_FLOW, TERMINAL_NEGATIVE } from '../lib/api';

const LABEL_TH: Record<string, string> = {
  submitted: 'ส่งใบสมัคร',
  screening: 'กำลังคัดกรอง',
  prescreened: 'ผ่านคัดกรอง AI',
  shortlisted: 'เข้ารอบ',
  interview: 'สัมภาษณ์',
  offer: 'ได้รับข้อเสนอ',
  accepted: 'ตอบรับ',
  rejected: 'ไม่ผ่าน',
  declined: 'ปฏิเสธข้อเสนอ',
  failed: 'คัดกรองไม่สำเร็จ',
};

export function statusLabel(status: string): string {
  return LABEL_TH[status] || status;
}

interface Props {
  status: string;
}

// แสดงลำดับสถานะตาม lifecycle (spec ข้อ 3) ไฮไลต์สถานะปัจจุบัน
export default function StatusStepper({ status }: Props) {
  const isNegative = TERMINAL_NEGATIVE.includes(status);
  const currentIndex = MAIN_FLOW.indexOf(status as (typeof MAIN_FLOW)[number]);

  return (
    <div className="stepper-wrap">
      <ol className="stepper">
        {MAIN_FLOW.map((s, i) => {
          const state =
            currentIndex >= 0 && i <= currentIndex ? 'done' : 'pending';
          const isCurrent = i === currentIndex;
          return (
            <li key={s} className={`stepper-item ${state} ${isCurrent ? 'current' : ''}`}>
              <span className="stepper-dot">{i + 1}</span>
              <span className="stepper-label">{statusLabel(s)}</span>
            </li>
          );
        })}
      </ol>
      {isNegative && (
        <p className="status-negative">สถานะปัจจุบัน: {statusLabel(status)}</p>
      )}
    </div>
  );
}
