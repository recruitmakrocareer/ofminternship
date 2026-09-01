import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPrograms, submitApplication, type ApplyPayload } from '../lib/api';
import { fileToBase64 } from '../lib/fileToBase64';
import { CONSENT_VERSION, MAX_DOC_BYTES, TURNSTILE_SITE_KEY } from '../config';
import Turnstile from '../components/Turnstile';

const DRAFT_KEY = 'ofm-draft';
const STEP_NAMES = ['ข้อมูลส่วนตัว', 'การศึกษา', 'อาจารย์ผู้ประสานงาน', 'ทักษะ & กิจกรรม', 'ความพร้อม', 'เอกสาร', 'ช่องทางข่าว', 'ยืนยัน (PDPA)'];
const SKILLS = ['Excel / Data', 'สื่อสาร', 'ทำงานเป็นทีม', 'ภาษาอังกฤษ', 'แก้ปัญหา', 'คลังสินค้า'];
const SOURCES = ['Facebook / Instagram', 'TikTok', 'ประกาศจากมหาวิทยาลัย', 'เพื่อน / รุ่นพี่แนะนำ', 'งาน Roadshow / บูธ'];
const PREFIXES = ['นาย', 'นาง', 'นางสาว', 'อื่น ๆ'];
const EDU_LEVELS = ['ปวช.', 'ปวส.', 'ปริญญาตรี', 'ปริญญาโท', 'อื่น ๆ'];
const TRANSPORT = [
  { v: 'car', label: 'รถยนต์' },
  { v: 'motorcycle', label: 'รถจักรยานยนต์' },
  { v: 'public_transport', label: 'รถสาธารณะ' },
];
// สาขาที่เปิดรับ 23 สาขา — เลือกได้เฉพาะรายการนี้เท่านั้น (ห้ามพิมพ์เอง)
// ผู้สมัครเลือกได้ 1–2 อันดับ · ภูมิภาคคำนวณจากอันดับ 1 ให้อัตโนมัติ
const STORE_GROUPS: { region: string; stores: string[] }[] = [
  { region: 'กรุงเทพฯ และปริมณฑล', stores: ['ST1 ลาดพร้าว', 'ST3 ศรีนครินทร์', 'ST8 รังสิต', 'ST18 สาทร', 'ST19 นครปฐม', 'ST54 คลองหลวง'] },
  { region: 'ภาคตะวันออก', stores: ['ST5 ชลบุรี', 'ST15 ระยอง', 'ST44 พัทยา', 'ST109 แหลมฉบัง'] },
  { region: 'ภาคเหนือ', stores: ['ST6 เชียงใหม่ 1', 'ST11 พิษณุโลก', 'ST16 นครสวรรค์', 'ST23 เชียงราย', 'ST52 ลำปาง'] },
  { region: 'ภาคตะวันออกเฉียงเหนือ', stores: ['ST7 นครราชสีมา', 'ST10 อุดรธานี', 'ST12 ขอนแก่น', 'ST14 อุบลราชธานี', 'ST48 หนองคาย'] },
  { region: 'ภาคใต้', stores: ['ST9 หาดใหญ่', 'ST27 ภูเก็ต', 'ST43 ชุมพร'] },
];
const ANY_STORE = 'ปฏิบัติงานได้ทุกสาขา';
const STORE_REGION: Record<string, string> = { [ANY_STORE]: 'ทุกภูมิภาค' };
STORE_GROUPS.forEach((g) => g.stores.forEach((s) => { STORE_REGION[s] = g.region; }));
const isStore = (v: string) => Object.prototype.hasOwnProperty.call(STORE_REGION, v);

const NOW = new Date();
const TODAY_ISO = NOW.toISOString().slice(0, 10);
const CUR_BE = NOW.getFullYear() + 543;
const GRAD_YEARS = Array.from({ length: 7 }, (_, i) => String(CUR_BE + i));

const thaiRe = /^[฀-๿\s.\-]+$/;
const enRe = /^[A-Za-z\s.'\-]+$/;
const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function fmtPhone(raw: string) {
  const p = (raw || '').replace(/\D/g, '').slice(0, 10);
  if (p.length <= 3) return p;
  if (p.length <= 6) return `${p.slice(0, 3)}-${p.slice(3)}`;
  return `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;
}

interface FormData {
  prefix: string;
  prefixOther: string;
  firstName: string;
  lastName: string;
  firstNameEn: string;
  lastNameEn: string;
  phone: string;
  lineId: string;
  email: string;
  birthDate: string;
  eduLevel: string;
  university: string;
  faculty: string;
  major: string;
  year: string;
  gpa: string;
  graduationYearBE: string;
  coordName: string;
  coordPhone: string;
  coordEmail: string;
  skills: string[];
  skillUsage: string;
  activities: string;
  availableFrom: string;
  availableTo: string;
  region: string; // คำนวณจาก preferBranch — ไม่ได้ถามผู้สมัครตรง ๆ
  preferBranch: string; // สาขาอันดับ 1
  preferBranch2: string; // สาขาอันดับ 2 (ไม่บังคับ)
  transport: string[];
  sources: string[];
}

const EMPTY: FormData = {
  prefix: '', prefixOther: '', firstName: '', lastName: '', firstNameEn: '', lastNameEn: '',
  phone: '', lineId: '', email: '', birthDate: '',
  eduLevel: '', university: '', faculty: '', major: '', year: '', gpa: '', graduationYearBE: '',
  coordName: '', coordPhone: '', coordEmail: '',
  skills: [], skillUsage: '', activities: '',
  availableFrom: '', availableTo: '', region: '', preferBranch: '', preferBranch2: '', transport: [], sources: [],
};

const ERR_MSG: Record<string, string> = {
  duplicate: 'อีเมลนี้เคยสมัครโครงการนี้แล้ว',
  captcha_failed: 'ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่',
  invalid_email: 'อีเมลไม่ถูกต้อง',
  invalid_phone: 'เบอร์มือถือไม่ถูกต้อง',
};

export default function Apply() {
  const nav = useNavigate();
  const [data, setData] = useState<FormData>(EMPTY);
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [resume, setResume] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<File | null>(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const [programId, setProgramId] = useState('');
  const [programName, setProgramName] = useState('Order Fulfillment Internship Program');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ trackingCode: string } | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
      if (saved && typeof saved === 'object') {
        // draft เก่าเคยพิมพ์ชื่อสาขาเองได้ — ค่าที่ไม่อยู่ในลิสต์ 23 สาขาต้องล้างทิ้ง
        if (!isStore(saved.preferBranch)) { saved.preferBranch = ''; saved.region = ''; }
        if (!isStore(saved.preferBranch2)) saved.preferBranch2 = '';
        setData((d) => ({ ...d, ...saved }));
      }
    } catch {
      /* ignore */
    }
    fetchPrograms().then((r) => {
      if (r.ok && r.programs && r.programs.length) {
        setProgramId(r.programs[0].programId);
        setProgramName(r.programs[0].name || 'Order Fulfillment Internship Program');
      }
    });
  }, []);

  function upd<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData((d) => {
      const next = { ...d, [key]: value };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }
  const onInput = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => upd(key, e.target.value as never);
  const toggleArr = (key: 'skills' | 'sources' | 'transport', v: string) => {
    const arr = data[key];
    upd(key, (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]) as never);
  };

  // เลือกสาขา — อันดับ 1 กำหนด region ให้เอง และล้างอันดับ 2 ถ้าซ้ำ/เลือกทุกสาขา
  function setBranch(rank: 1 | 2, v: string) {
    setData((d) => {
      const next = { ...d };
      if (rank === 1) {
        next.preferBranch = v;
        next.region = STORE_REGION[v] || '';
        if (v === ANY_STORE || v === d.preferBranch2) next.preferBranch2 = '';
      } else {
        next.preferBranch2 = v;
      }
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function pickFile(setter: (f: File | null) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0] || null;
      if (f && f.size > MAX_DOC_BYTES) {
        setError(`ไฟล์ "${f.name}" ใหญ่เกิน 5MB`);
        e.target.value = '';
        return;
      }
      setError('');
      setter(f);
    };
  }

  // ตรวจ error ของแต่ละ step → object { field: message }
  function stepErrors(s: number): Record<string, string> {
    const f = data;
    const e: Record<string, string> = {};
    const req = (v: string) => !(v && String(v).trim());
    if (s === 0) {
      if (!f.prefix) e.prefix = 'กรุณาเลือกคำนำหน้า';
      if (f.prefix === 'อื่น ๆ' && req(f.prefixOther)) e.prefixOther = 'กรุณาระบุคำนำหน้าชื่อ';
      if (req(f.firstName)) e.firstName = 'กรุณากรอกชื่อจริง';
      else if (!thaiRe.test(f.firstName)) e.firstName = 'กรอกเฉพาะตัวอักษรภาษาไทย';
      if (req(f.lastName)) e.lastName = 'กรุณากรอกนามสกุล';
      else if (!thaiRe.test(f.lastName)) e.lastName = 'กรอกเฉพาะตัวอักษรภาษาไทย';
      if (req(f.firstNameEn)) e.firstNameEn = 'กรุณากรอกชื่อภาษาอังกฤษ';
      else if (!enRe.test(f.firstNameEn)) e.firstNameEn = 'กรอกเฉพาะตัวอักษรภาษาอังกฤษ';
      if (req(f.lastNameEn)) e.lastNameEn = 'กรุณากรอกนามสกุลภาษาอังกฤษ';
      else if (!enRe.test(f.lastNameEn)) e.lastNameEn = 'กรอกเฉพาะตัวอักษรภาษาอังกฤษ';
      if (!/^0\d{9}$/.test((f.phone || '').replace(/\D/g, ''))) e.phone = 'กรุณาระบุเบอร์มือถือให้ครบ 10 หลัก';
      if (req(f.lineId)) e.lineId = 'กรุณาระบุ Line ID';
      if (req(f.email)) e.email = 'กรุณากรอกอีเมล';
      else if (!emailRe.test(f.email)) e.email = 'รูปแบบอีเมลไม่ถูกต้อง';
      if (req(f.birthDate)) e.birthDate = 'กรุณาเลือกวันเดือนปีเกิด';
      else if (f.birthDate > TODAY_ISO) e.birthDate = 'ห้ามเลือกวันที่ในอนาคต';
    }
    if (s === 1) {
      const map: Record<string, string> = {
        eduLevel: 'กรุณาเลือกระดับการศึกษา', university: 'กรุณากรอกสถาบัน', faculty: 'กรุณากรอกคณะ',
        major: 'กรุณากรอกสาขาวิชา', year: 'กรุณากรอกชั้นปี', gpa: 'กรุณากรอก GPAX', graduationYearBE: 'กรุณาเลือกปีที่คาดว่าจะสำเร็จ',
      };
      Object.keys(map).forEach((k) => {
        if (req((f as never as Record<string, string>)[k])) e[k] = map[k];
      });
    }
    if (s === 3) {
      if (f.skills.length > 0 && (f.skillUsage || '').trim().length < 20) e.skillUsage = 'กรุณาอธิบายตัวอย่างการนำทักษะไปใช้อย่างน้อย 20 ตัวอักษร';
    }
    if (s === 4) {
      if (req(f.availableFrom)) e.availableFrom = 'กรุณาเลือกวันที่เริ่มฝึกงาน';
      if (req(f.availableTo)) e.availableTo = 'กรุณาเลือกวันสุดท้าย';
      else if (f.availableFrom && f.availableTo <= f.availableFrom) e.availableTo = 'วันสุดท้ายต้องอยู่หลังวันเริ่มฝึกงาน';
      if (!isStore(f.preferBranch)) e.preferBranch = 'กรุณาเลือกสาขาอันดับ 1';
      else if (f.preferBranch2 && f.preferBranch2 === f.preferBranch) e.preferBranch2 = 'อันดับ 2 ต้องไม่ซ้ำกับอันดับ 1';
      if (!f.transport.length) e.transport = 'กรุณาเลือกวิธีเดินทางอย่างน้อย 1 ข้อ';
    }
    if (s === 5) {
      if (!photo) e.photo = 'กรุณาแนบรูปถ่ายหน้าตรง';
      if (!resume) e.resume = 'กรุณาแนบ Resume';
      if (!transcript) e.transcript = 'กรุณาแนบ Transcript';
    }
    if (s === 7) {
      if (!consent) e.consent = 'กรุณายินยอม PDPA';
      if (TURNSTILE_SITE_KEY && !captchaToken) e.captcha = 'กรุณายืนยันว่าไม่ใช่บอท';
    }
    return e;
  }

  const errs = attempted ? stepErrors(step) : {};
  const Err = ({ k }: { k: string }) => (errs[k] ? <p className="field-err">{errs[k]}</p> : null);

  function next() {
    setError('');
    if (Object.keys(stepErrors(step)).length) {
      setAttempted(true);
      return;
    }
    setAttempted(false);
    setStep((s) => Math.min(7, s + 1));
    window.scrollTo({ top: 0 });
  }
  function back() {
    setError('');
    setAttempted(false);
    if (step > 0) setStep((s) => s - 1);
    else nav('/');
    window.scrollTo({ top: 0 });
  }

  async function handleSubmit() {
    for (let s = 0; s <= 7; s++) {
      if (Object.keys(stepErrors(s)).length) {
        setStep(s);
        setAttempted(true);
        return;
      }
    }
    setSubmitting(true);
    setError('');
    try {
      const payload: ApplyPayload = {
        programId,
        positionApplied: programName,
        personal: { firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone, lineUserId: data.lineId },
        education: { university: data.university, faculty: data.faculty, major: data.major, gpa: data.gpa, yearLevel: data.year, expectedGradYear: data.graduationYearBE },
        consent: { accepted: consent, version: CONSENT_VERSION },
        files: {
          photo: photo ? await fileToBase64(photo) : undefined,
          resume: resume ? await fileToBase64(resume) : undefined,
          transcript: transcript ? await fileToBase64(transcript) : undefined,
        },
        form: { ...data },
        turnstileToken: captchaToken || undefined,
      };
      const res = await submitApplication(payload);
      if (res.ok) {
        localStorage.removeItem(DRAFT_KEY);
        setResult({ trackingCode: res.trackingCode });
      } else if (res.error === 'duplicate') {
        setStep(7);
        setError(`อีเมลนี้เคยสมัครโครงการนี้แล้ว${res.trackingCode ? ` (รหัสติดตาม: ${res.trackingCode})` : ''}`);
      } else {
        setError('ส่งใบสมัครไม่สำเร็จ: ' + (ERR_MSG[res.error] || res.error || 'unknown'));
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาด: ' + String(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ระยะเวลาฝึกงานโดยประมาณ
  const durationWeeks =
    data.availableFrom && data.availableTo && data.availableTo > data.availableFrom
      ? Math.round((new Date(data.availableTo).getTime() - new Date(data.availableFrom).getTime()) / (7 * 864e5))
      : 0;

  if (result) {
    return (
      <div className="apply-wrap">
        <div className="success-wrap">
          <h1 style={{ color: '#fff' }}>✅ ส่งใบสมัครสำเร็จ</h1>
          <p className="muted">บริษัทได้รับใบสมัครของคุณแล้ว รหัสติดตามคือ</p>
          <div className="tracking-code">{result.trackingCode}</div>
          <p className="muted" style={{ fontSize: 13 }}>
            ทีม Talent Acquisition จะติดต่อผู้ที่ผ่านการพิจารณาเบื้องต้น กรุณาบันทึกรหัสนี้เพื่อติดตามสถานะ
          </p>
          <button className="btn btn-red btn-block" style={{ marginTop: 18 }} onClick={() => nav('/track')}>
            ไปหน้าติดตามใบสมัคร
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="apply-wrap">
      <div className="apply-header">
        <div className="apply-header-top">
          <button className="apply-back" onClick={back}>
            ← สมัครฝึกงาน
          </button>
          <span className="save-chip">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFC42E" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            บันทึกร่างแล้ว
          </span>
        </div>
        <div className="seg-bar">
          {STEP_NAMES.map((_, i) => (
            <span key={i} className={`seg ${i <= step ? 'on' : ''}`} />
          ))}
        </div>
        <div className="step-counter">
          ขั้นที่ {step + 1} จาก 8 · {STEP_NAMES[step]}
        </div>
      </div>

      <div className="apply-body scroll">
        {/* STEP 0 — personal */}
        {step === 0 && (
          <div>
            <h2 className="step-title">มาทำความรู้จักกันก่อน 👋</h2>
            <p className="step-sub">ใช้เวลาประมาณ 2 นาที · ข้อมูลจะถูกบันทึกอัตโนมัติ</p>
            <label className="lbl">โครงการที่สมัคร</label>
            <div className="fld" style={{ marginBottom: 18 }}>{programName}</div>

            <label className="lbl">คำนำหน้า <span className="req">*</span></label>
            <div className="prefix-row" style={{ flexWrap: 'wrap', marginBottom: 6 }}>
              {PREFIXES.map((p) => (
                <button key={p} className={`prefix-btn ${data.prefix === p ? 'on' : ''}`} onClick={() => upd('prefix', p)}>
                  {p}
                </button>
              ))}
            </div>
            <Err k="prefix" />
            {data.prefix === 'อื่น ๆ' && (
              <div style={{ marginTop: 12 }}>
                <label className="lbl">โปรดระบุคำนำหน้าชื่อ <span className="req">*</span></label>
                <input className="fld" value={data.prefixOther} onChange={onInput('prefixOther')} placeholder="เช่น ว่าที่ ร.ต." />
                <Err k="prefixOther" />
              </div>
            )}

            <div className="row-2" style={{ marginTop: 18 }}>
              <div>
                <label className="lbl">ชื่อจริง (ภาษาไทย) <span className="req">*</span></label>
                <input className="fld" value={data.firstName} onChange={onInput('firstName')} placeholder="ธนวัฒน์" />
                <Err k="firstName" />
              </div>
              <div>
                <label className="lbl">นามสกุล (ภาษาไทย) <span className="req">*</span></label>
                <input className="fld" value={data.lastName} onChange={onInput('lastName')} placeholder="ใจดี" />
                <Err k="lastName" />
              </div>
            </div>
            <div className="row-2" style={{ marginTop: 18 }}>
              <div>
                <label className="lbl">First Name (English) <span className="req">*</span></label>
                <input className="fld" value={data.firstNameEn} onChange={onInput('firstNameEn')} placeholder="Thanawat" />
                <Err k="firstNameEn" />
              </div>
              <div>
                <label className="lbl">Last Name (English) <span className="req">*</span></label>
                <input className="fld" value={data.lastNameEn} onChange={onInput('lastNameEn')} placeholder="Jaidee" />
                <Err k="lastNameEn" />
              </div>
            </div>

            <label className="lbl" style={{ marginTop: 18 }}>เบอร์มือถือ <span className="req">*</span></label>
            <input className="fld" value={fmtPhone(data.phone)} onChange={(e) => upd('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="xxx-xxx-xxxx" />
            <Err k="phone" />

            <label className="lbl" style={{ marginTop: 18 }}>Line ID <span className="req">*</span></label>
            <input className="fld" value={data.lineId} onChange={onInput('lineId')} placeholder="กรุณาระบุ Line ID" />
            <Err k="lineId" />

            <label className="lbl" style={{ marginTop: 18 }}>Email <span className="req">*</span></label>
            <input className="fld" value={data.email} onChange={onInput('email')} inputMode="email" placeholder="you@email.com" />
            <Err k="email" />

            <label className="lbl" style={{ marginTop: 18 }}>วันเดือนปีเกิด <span className="req">*</span></label>
            <input type="date" className="fld" value={data.birthDate} onChange={onInput('birthDate')} max={TODAY_ISO} />
            <Err k="birthDate" />
          </div>
        )}

        {/* STEP 1 — education */}
        {step === 1 && (
          <div>
            <h2 className="step-title">ข้อมูลการศึกษา 🎓</h2>
            <p className="step-sub">บอกเราว่าคุณเรียนที่ไหน สาขาอะไร</p>
            <label className="lbl">ระดับการศึกษา <span className="req">*</span></label>
            <select className="fld" value={data.eduLevel} onChange={onInput('eduLevel')}>
              <option value="">เลือกระดับการศึกษา</option>
              {EDU_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <Err k="eduLevel" />
            <label className="lbl" style={{ marginTop: 16 }}>มหาวิทยาลัย / สถาบัน <span className="req">*</span></label>
            <input className="fld" value={data.university} onChange={onInput('university')} placeholder="เช่น จุฬาลงกรณ์มหาวิทยาลัย" />
            <Err k="university" />
            <label className="lbl" style={{ marginTop: 16 }}>คณะ <span className="req">*</span></label>
            <input className="fld" value={data.faculty} onChange={onInput('faculty')} placeholder="เช่น พาณิชยศาสตร์และการบัญชี" />
            <Err k="faculty" />
            <label className="lbl" style={{ marginTop: 16 }}>สาขาวิชา <span className="req">*</span></label>
            <input className="fld" value={data.major} onChange={onInput('major')} placeholder="เช่น การจัดการโลจิสติกส์" />
            <Err k="major" />
            <div className="row-2" style={{ marginTop: 16 }}>
              <div>
                <label className="lbl">ชั้นปี <span className="req">*</span></label>
                <input className="fld" value={data.year} onChange={onInput('year')} inputMode="numeric" placeholder="เช่น 3" />
                <Err k="year" />
              </div>
              <div>
                <label className="lbl">เกรดเฉลี่ย (GPAX) <span className="req">*</span></label>
                <input className="fld" value={data.gpa} onChange={onInput('gpa')} inputMode="decimal" placeholder="เช่น 3.25" />
                <Err k="gpa" />
              </div>
            </div>
            <label className="lbl" style={{ marginTop: 16 }}>ปีที่คาดว่าจะสำเร็จการศึกษา <span className="req">*</span></label>
            <select className="fld" value={data.graduationYearBE} onChange={onInput('graduationYearBE')}>
              <option value="">เลือกปีที่คาดว่าจะสำเร็จ (พ.ศ.)</option>
              {GRAD_YEARS.map((y) => (
                <option key={y} value={y}>พ.ศ. {y}</option>
              ))}
            </select>
            <Err k="graduationYearBE" />
          </div>
        )}

        {/* STEP 2 — coordinator */}
        {step === 2 && (
          <div>
            <h2 className="step-title">อาจารย์ผู้ประสานงาน 📞</h2>
            <p className="step-sub">ผู้ที่มหาวิทยาลัยมอบหมายให้ดูแลการฝึกงาน</p>
            <label className="lbl">ชื่อ–นามสกุล อาจารย์</label>
            <input className="fld" style={{ marginBottom: 18 }} value={data.coordName} onChange={onInput('coordName')} placeholder="เช่น อ.สมชาย รักเรียน" />
            <label className="lbl">เบอร์ติดต่อ</label>
            <input className="fld" style={{ marginBottom: 18 }} value={data.coordPhone} onChange={onInput('coordPhone')} inputMode="numeric" placeholder="0X XXX XXXX" />
            <label className="lbl">อีเมลอาจารย์</label>
            <input className="fld" value={data.coordEmail} onChange={onInput('coordEmail')} inputMode="email" placeholder="advisor@university.ac.th" />
          </div>
        )}

        {/* STEP 3 — skills */}
        {step === 3 && (
          <div>
            <h2 className="step-title">ทักษะ &amp; กิจกรรม ✨</h2>
            <p className="step-sub">เลือกทักษะที่ใช่ แล้วเล่าประสบการณ์สั้น ๆ</p>
            <label className="lbl">ทักษะเด่น (เลือกได้หลายข้อ)</label>
            <div className="chips" style={{ marginBottom: 20 }}>
              {SKILLS.map((s) => (
                <button key={s} className={`chip ${data.skills.includes(s) ? 'on' : ''}`} onClick={() => toggleArr('skills', s)}>
                  {s}
                </button>
              ))}
            </div>
            {data.skills.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label className="lbl">กรุณาอธิบายว่าท่านเคยใช้ทักษะที่เลือกทำอะไร <span className="req">*</span></label>
                <textarea className="fld" rows={4} value={data.skillUsage} onChange={onInput('skillUsage')} placeholder="ตัวอย่าง: ใช้ Microsoft Excel จัดทำรายงานรายรับ–รายจ่ายของชมรม และใช้ PivotTable สรุปข้อมูลค่าใช้จ่ายแต่ละกิจกรรม" />
                <p className="field-hint">โปรดระบุว่าท่านใช้ทักษะดังกล่าวในกิจกรรม การเรียน โครงการ งานพิเศษ หรือประสบการณ์ใด พร้อมยกตัวอย่างโดยสังเขป</p>
                <Err k="skillUsage" />
              </div>
            )}
            <label className="lbl">ประสบการณ์ / กิจกรรมเด่น</label>
            <textarea className="fld" rows={4} value={data.activities} onChange={onInput('activities')} placeholder="เช่น เคยเป็นประธานชมรม, ฝึกงานร้านค้า, โครงงาน..." />
          </div>
        )}

        {/* STEP 4 — availability */}
        {step === 4 && (
          <div>
            <h2 className="step-title">ความพร้อมฝึกงาน 📅</h2>
            <p className="step-sub">ช่วงเวลาและสาขาที่สะดวก</p>
            <label className="lbl">วันที่สามารถเริ่มฝึกงานได้ <span className="req">*</span></label>
            <input type="date" className="fld" value={data.availableFrom} onChange={onInput('availableFrom')} min={TODAY_ISO} />
            <Err k="availableFrom" />
            <label className="lbl" style={{ marginTop: 16 }}>วันที่สามารถฝึกงานวันสุดท้าย <span className="req">*</span></label>
            <input type="date" className="fld" value={data.availableTo} onChange={onInput('availableTo')} min={data.availableFrom || TODAY_ISO} />
            <Err k="availableTo" />
            {durationWeeks > 0 && <p className="dur-note">ระยะเวลาฝึกงานโดยประมาณ {durationWeeks} สัปดาห์</p>}
            <label className="lbl" style={{ marginTop: 16 }}>สาขาที่สะดวกปฏิบัติงาน — อันดับ 1 <span className="req">*</span></label>
            <select className="fld" value={data.preferBranch} onChange={(e) => setBranch(1, e.target.value)}>
              <option value="">เลือกสาขา</option>
              <option value={ANY_STORE}>{ANY_STORE}</option>
              {STORE_GROUPS.map((g) => (
                <optgroup key={g.region} label={`${g.region} — ${g.stores.length} สาขา`}>
                  {g.stores.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <Err k="preferBranch" />
            {data.region && <p className="dur-note">ภูมิภาค: {data.region}</p>}

            {data.preferBranch && data.preferBranch !== ANY_STORE && (
              <>
                <label className="lbl" style={{ marginTop: 16 }}>สาขาที่สะดวกปฏิบัติงาน — อันดับ 2 (ถ้ามี)</label>
                <select className="fld" value={data.preferBranch2} onChange={(e) => setBranch(2, e.target.value)}>
                  <option value="">ไม่ระบุ</option>
                  {STORE_GROUPS.map((g) => {
                    const opts = g.stores.filter((s) => s !== data.preferBranch);
                    return (
                      <optgroup key={g.region} label={`${g.region} — ${opts.length} สาขา`}>
                        {opts.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                <Err k="preferBranch2" />
              </>
            )}
            <label className="lbl" style={{ marginTop: 16 }}>ท่านสามารถเดินทางไปปฏิบัติงานด้วยวิธีใด (เลือกได้หลายข้อ) <span className="req">*</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
              {TRANSPORT.map((t) => (
                <button key={t.v} className={`chip chip-block ${data.transport.includes(t.v) ? 'on' : ''}`} onClick={() => toggleArr('transport', t.v)}>
                  {t.label}
                </button>
              ))}
            </div>
            <Err k="transport" />
          </div>
        )}

        {/* STEP 5 — documents */}
        {step === 5 && (
          <div>
            <h2 className="step-title">แนบเอกสารกันหน่อย 📎</h2>
            <p className="step-sub">ไฟล์ละไม่เกิน 5MB · รองรับ PDF / รูปภาพ</p>
            <label className="upzone gold">
              <input type="file" accept=".jpg,.jpeg,.png" hidden onChange={pickFile(setPhoto)} />
              <div className="ico" style={{ background: 'rgba(255,196,46,.15)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFC42E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
              <div className="t">รูปถ่ายหน้าตรง</div>
              <div className="s">แตะเพื่อเลือกรูป · JPG/PNG</div>
              {photo && <div className="picked">📎 {photo.name}</div>}
            </label>
            <Err k="photo" />
            <label className="upzone red">
              <input type="file" accept=".pdf,.doc,.docx" hidden onChange={pickFile(setResume)} />
              <div className="ico" style={{ background: 'rgba(226,35,26,.15)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF5A50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
              </div>
              <div className="t">Resume / ประวัติส่วนตัว</div>
              <div className="s">แตะเพื่อเลือกไฟล์ · PDF, DOC</div>
              {resume && <div className="picked">📎 {resume.name}</div>}
            </label>
            <Err k="resume" />
            <label className="upzone">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={pickFile(setTranscript)} />
              <div className="ico" style={{ background: 'rgba(63,197,240,.12)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3FC5F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6" />
                </svg>
              </div>
              <div className="t">Transcript</div>
              <div className="s">แตะเพื่อเลือกไฟล์ · PDF, รูป</div>
              {transcript && <div className="picked">📎 {transcript.name}</div>}
            </label>
            <Err k="transcript" />
            <div className="note-tip">
              <span>💡</span> Portfolio และหนังสือขอฝึกงาน แนบทีหลังได้ ไม่บังคับตอนนี้
            </div>
          </div>
        )}

        {/* STEP 6 — sources */}
        {step === 6 && (
          <div>
            <h2 className="step-title">รู้จักโครงการจากไหน? 📣</h2>
            <p className="step-sub">เลือกได้หลายช่องทาง ช่วยให้เราปรับปรุงการสื่อสาร</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SOURCES.map((s) => (
                <button key={s} className={`chip chip-block ${data.sources.includes(s) ? 'on' : ''}`} onClick={() => toggleArr('sources', s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 7 — PDPA */}
        {step === 7 && (
          <div>
            <h2 className="step-title">ขั้นตอนสุดท้าย 🔒</h2>
            <p className="step-sub">ตรวจสอบและยินยอมให้เราเก็บข้อมูล</p>
            <div className="summary-card">
              <div className="h">สรุปใบสมัคร</div>
              <div className="summary-row">
                <span className="muted">ชื่อ</span>
                <span style={{ color: '#fff' }}>
                  {data.prefix === 'อื่น ๆ' ? data.prefixOther : data.prefix} {data.firstName} {data.lastName}
                </span>
              </div>
              <div className="summary-row">
                <span className="muted">โครงการ</span>
                <span style={{ color: '#fff' }}>{programName}</span>
              </div>
              <div className="summary-row">
                <span className="muted">ติดต่อ</span>
                <span style={{ color: '#fff' }}>{fmtPhone(data.phone) || data.email || '—'}</span>
              </div>
            </div>
            <button className={`consent-box ${consent ? 'on' : ''}`} onClick={() => setConsent((c) => !c)}>
              <span className="consent-tick">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A1A3F" strokeWidth="3.5" style={{ opacity: consent ? 1 : 0 }}>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.55, color: '#EAF0FF' }}>
                ข้าพเจ้ายินยอมให้บริษัทเก็บและใช้ข้อมูลส่วนบุคคลเพื่อการพิจารณารับสมัครฝึกงาน ตาม{' '}
                <a href={`${import.meta.env.BASE_URL}#/privacy`} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }} onClick={(e) => e.stopPropagation()}>
                  ประกาศความเป็นส่วนตัว (PDPA)
                </a>
              </span>
            </button>
            <Err k="consent" />
            <Turnstile onToken={setCaptchaToken} />
            <Err k="captcha" />
          </div>
        )}

        {error && <p className="error-text" style={{ marginTop: 16 }}>{error}</p>}
      </div>

      <div className="apply-footer">
        <button className="icon-btn" onClick={back}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        {step < 7 ? (
          <button className="btn btn-red" style={{ flex: 1 }} onClick={next}>
            ถัดไป →
          </button>
        ) : (
          <button className="btn btn-red" style={{ flex: 1 }} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'กำลังส่ง…' : 'ส่งใบสมัคร ✓'}
          </button>
        )}
      </div>
    </div>
  );
}
