import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPrograms, submitApplication, type ApplyPayload } from '../lib/api';
import { fileToBase64 } from '../lib/fileToBase64';
import { CONSENT_VERSION, MAX_DOC_BYTES, TURNSTILE_SITE_KEY } from '../config';
import Turnstile from '../components/Turnstile';

const ERR_MSG: Record<string, string> = {
  invalid_email: 'อีเมลไม่ถูกต้อง',
  invalid_phone: 'เบอร์มือถือไม่ถูกต้อง (10 หลัก)',
  invalid_gpa: 'GPAX ต้องอยู่ระหว่าง 0–4',
  missing_name: 'กรุณากรอกชื่อ–นามสกุล',
  missing_education: 'กรุณากรอกข้อมูลการศึกษา',
  consent_required: 'กรุณายินยอม PDPA ก่อนส่ง',
  captcha_failed: 'ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่',
};

const DRAFT_KEY = 'ofm-draft';
const STEP_NAMES = ['ข้อมูลส่วนตัว', 'การศึกษา', 'อาจารย์ผู้ประสานงาน', 'ทักษะ & กิจกรรม', 'ความพร้อม', 'เอกสาร', 'ช่องทางข่าว', 'ยืนยัน (PDPA)'];
const SKILLS = ['Excel / Data', 'สื่อสาร', 'ทำงานเป็นทีม', 'ภาษาอังกฤษ', 'แก้ปัญหา', 'คลังสินค้า'];
const SOURCES = ['Facebook / Instagram', 'TikTok', 'ประกาศจากมหาวิทยาลัย', 'เพื่อน / รุ่นพี่แนะนำ', 'งาน Roadshow / บูธ'];
const PREFIXES = ['นาย', 'นางสาว', 'อื่น ๆ'];

interface FormData {
  prefix: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  university: string;
  faculty: string;
  major: string;
  year: string;
  gpa: string;
  coordName: string;
  coordPhone: string;
  coordEmail: string;
  skills: string[];
  activities: string;
  availableFrom: string;
  preferBranch: string;
  vehicle: boolean;
  sources: string[];
}

const EMPTY: FormData = {
  prefix: '', firstName: '', lastName: '', phone: '', email: '',
  university: '', faculty: '', major: '', year: '', gpa: '',
  coordName: '', coordPhone: '', coordEmail: '',
  skills: [], activities: '', availableFrom: '', preferBranch: '', vehicle: false, sources: [],
};

const phoneOk = (v: string) => /^0\d{9}$/.test(v);
const emailOk = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

export default function Apply() {
  const nav = useNavigate();
  const [data, setData] = useState<FormData>(EMPTY);
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [resume, setResume] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<File | null>(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const [programId, setProgramId] = useState('');
  const [programName, setProgramName] = useState('Order Fulfillment Internship');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ trackingCode: string } | null>(null);

  // restore draft
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
      if (saved && typeof saved === 'object') setData((d) => ({ ...d, ...saved }));
    } catch {
      /* ignore */
    }
    fetchPrograms().then((r) => {
      if (r.ok && r.programs && r.programs.length) {
        setProgramId(r.programs[0].programId);
        setProgramName(r.programs[0].name || 'Order Fulfillment Internship');
      }
    });
  }, []);

  function upd<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData((d) => {
      const nextData = { ...d, [key]: value };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(nextData));
      } catch {
        /* ignore */
      }
      return nextData;
    });
  }
  const onInput = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => upd(key, e.target.value as never);
  const toggleArr = (key: 'skills' | 'sources', v: string) => {
    const arr = data[key];
    upd(key, (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]) as never);
  };

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

  function validateForSubmit(): { ok: boolean; step?: number; msg?: string } {
    if (!programId) return { ok: false, step: 0, msg: 'ยังไม่มีโครงการเปิดรับ' };
    if (!data.firstName.trim() || !data.lastName.trim()) return { ok: false, step: 0, msg: 'กรุณากรอกชื่อ–นามสกุล' };
    if (!phoneOk(data.phone)) return { ok: false, step: 0, msg: 'เบอร์มือถือไม่ถูกต้อง (10 หลัก)' };
    if (!emailOk(data.email)) return { ok: false, step: 0, msg: 'อีเมลไม่ถูกต้อง' };
    if (!data.university.trim()) return { ok: false, step: 1, msg: 'กรุณากรอกมหาวิทยาลัย' };
    if (!photo) return { ok: false, step: 5, msg: 'กรุณาแนบรูปถ่ายหน้าตรง' };
    if (!resume) return { ok: false, step: 5, msg: 'กรุณาแนบ Resume' };
    if (!transcript) return { ok: false, step: 5, msg: 'กรุณาแนบ Transcript' };
    if (!consent) return { ok: false, step: 7, msg: 'กรุณายินยอมตามประกาศความเป็นส่วนตัว (PDPA)' };
    if (TURNSTILE_SITE_KEY && !captchaToken) return { ok: false, step: 7, msg: 'กรุณายืนยันว่าไม่ใช่บอท' };
    return { ok: true };
  }

  async function handleSubmit() {
    const v = validateForSubmit();
    if (!v.ok) {
      setStep(v.step!);
      setError(v.msg!);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload: ApplyPayload = {
        programId,
        positionApplied: programName,
        personal: { firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone, lineUserId: '' },
        education: { university: data.university, faculty: data.faculty, major: data.major, gpa: data.gpa, yearLevel: data.year, expectedGradYear: '' },
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

  function next() {
    setError('');
    setStep((s) => Math.min(7, s + 1));
    window.scrollTo({ top: 0 });
  }
  function back() {
    setError('');
    if (step > 0) setStep((s) => s - 1);
    else nav('/');
    window.scrollTo({ top: 0 });
  }

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
      {/* progress header */}
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

      {/* body */}
      <div className="apply-body scroll">
        {step === 0 && (
          <div>
            <h2 className="step-title">มาทำความรู้จักกันก่อน 👋</h2>
            <p className="step-sub">ใช้เวลาประมาณ 2 นาที · ข้อมูลจะถูกบันทึกอัตโนมัติ</p>
            <label className="lbl">โครงการที่สมัคร</label>
            <div className="fld" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span>{programName}</span>
            </div>
            <label className="lbl">คำนำหน้า</label>
            <div className="prefix-row" style={{ marginBottom: 18 }}>
              {PREFIXES.map((p) => (
                <button key={p} className={`prefix-btn ${data.prefix === p ? 'on' : ''}`} onClick={() => upd('prefix', p)}>
                  {p}
                </button>
              ))}
            </div>
            <div className="row-2" style={{ marginBottom: 18 }}>
              <div>
                <label className="lbl">ชื่อจริง</label>
                <input className="fld" value={data.firstName} onChange={onInput('firstName')} placeholder="ธนวัฒน์" />
              </div>
              <div>
                <label className="lbl">นามสกุล</label>
                <input className="fld" value={data.lastName} onChange={onInput('lastName')} placeholder="ใจดี" />
              </div>
            </div>
            <label className="lbl">เบอร์มือถือ</label>
            <input className="fld" value={data.phone} onChange={onInput('phone')} placeholder="08X XXX XXXX" inputMode="numeric" />
            {data.phone && <p className={phoneOk(data.phone) ? 'hint-ok' : 'hint-bad'}>{phoneOk(data.phone) ? '✓ เบอร์ถูกต้อง' : 'กรุณากรอกเบอร์ 10 หลัก ขึ้นต้นด้วย 0'}</p>}
            <label className="lbl" style={{ marginTop: 18 }}>
              Email
            </label>
            <input className="fld" value={data.email} onChange={onInput('email')} placeholder="you@email.com" type="email" />
            {data.email && <p className={emailOk(data.email) ? 'hint-ok' : 'hint-bad'}>{emailOk(data.email) ? '✓ อีเมลถูกต้อง' : 'รูปแบบอีเมลไม่ถูกต้อง'}</p>}
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="step-title">ข้อมูลการศึกษา 🎓</h2>
            <p className="step-sub">บอกเราว่าคุณเรียนที่ไหน สาขาอะไร</p>
            <label className="lbl">มหาวิทยาลัย / สถาบัน</label>
            <input className="fld" style={{ marginBottom: 18 }} value={data.university} onChange={onInput('university')} placeholder="เช่น จุฬาลงกรณ์มหาวิทยาลัย" />
            <label className="lbl">คณะ</label>
            <input className="fld" style={{ marginBottom: 18 }} value={data.faculty} onChange={onInput('faculty')} placeholder="เช่น พาณิชยศาสตร์และการบัญชี" />
            <label className="lbl">สาขาวิชา</label>
            <input className="fld" style={{ marginBottom: 18 }} value={data.major} onChange={onInput('major')} placeholder="เช่น การจัดการโลจิสติกส์" />
            <div className="row-2">
              <div>
                <label className="lbl">ชั้นปี</label>
                <input className="fld" value={data.year} onChange={onInput('year')} placeholder="เช่น 3" inputMode="numeric" />
              </div>
              <div>
                <label className="lbl">เกรดเฉลี่ย (GPAX)</label>
                <input className="fld" value={data.gpa} onChange={onInput('gpa')} placeholder="เช่น 3.25" inputMode="decimal" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="step-title">อาจารย์ผู้ประสานงาน 📞</h2>
            <p className="step-sub">ผู้ที่มหาวิทยาลัยมอบหมายให้ดูแลการฝึกงาน</p>
            <label className="lbl">ชื่อ–นามสกุล อาจารย์</label>
            <input className="fld" style={{ marginBottom: 18 }} value={data.coordName} onChange={onInput('coordName')} placeholder="เช่น อ.สมชาย รักเรียน" />
            <label className="lbl">เบอร์ติดต่อ</label>
            <input className="fld" style={{ marginBottom: 18 }} value={data.coordPhone} onChange={onInput('coordPhone')} placeholder="0X XXX XXXX" inputMode="numeric" />
            <label className="lbl">อีเมลอาจารย์</label>
            <input className="fld" value={data.coordEmail} onChange={onInput('coordEmail')} placeholder="advisor@university.ac.th" type="email" />
          </div>
        )}

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
            <label className="lbl">ประสบการณ์ / กิจกรรมเด่น</label>
            <textarea className="fld" rows={4} value={data.activities} onChange={onInput('activities')} placeholder="เช่น เคยเป็นประธานชมรม, ฝึกงานร้านค้า, โครงงาน..." />
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="step-title">ความพร้อมฝึกงาน 📅</h2>
            <p className="step-sub">ช่วงเวลาและสาขาที่สะดวก</p>
            <label className="lbl">พร้อมเริ่มฝึกวันที่</label>
            <input className="fld" style={{ marginBottom: 18 }} value={data.availableFrom} onChange={onInput('availableFrom')} placeholder="เช่น 1 ต.ค. 2569" />
            <label className="lbl">สาขา Makro ที่สะดวก</label>
            <input className="fld" style={{ marginBottom: 18 }} value={data.preferBranch} onChange={onInput('preferBranch')} placeholder="เช่น แม็คโคร สาขาลาดพร้าว" />
            <div className="toggle-row">
              <div>
                <div style={{ font: "600 14px 'Anuphan'", color: '#fff' }}>มีพาหนะส่วนตัว</div>
                <div style={{ fontSize: 12, color: '#A9B6D4' }}>สะดวกเดินทางไปสาขา</div>
              </div>
              <button className={`toggle ${data.vehicle ? 'on' : ''}`} onClick={() => upd('vehicle', !data.vehicle)}>
                <span className="knob" />
              </button>
            </div>
          </div>
        )}

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

            <div className="note-tip">
              <span>💡</span> Portfolio และหนังสือขอฝึกงาน แนบทีหลังได้ ไม่บังคับตอนนี้
            </div>
          </div>
        )}

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

        {step === 7 && (
          <div>
            <h2 className="step-title">ขั้นตอนสุดท้าย 🔒</h2>
            <p className="step-sub">ตรวจสอบและยินยอมให้เราเก็บข้อมูล</p>
            <div className="summary-card">
              <div className="h">สรุปใบสมัคร</div>
              <div className="summary-row">
                <span className="muted">ชื่อ</span>
                <span style={{ color: '#fff' }}>
                  {data.firstName} {data.lastName}
                </span>
              </div>
              <div className="summary-row">
                <span className="muted">โครงการ</span>
                <span style={{ color: '#fff' }}>{programName}</span>
              </div>
              <div className="summary-row">
                <span className="muted">ติดต่อ</span>
                <span style={{ color: '#fff' }}>{data.phone || data.email || '—'}</span>
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
                <a
                  href={`${import.meta.env.BASE_URL}#/privacy`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'underline' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  ประกาศความเป็นส่วนตัว (PDPA)
                </a>
              </span>
            </button>
            <Turnstile onToken={setCaptchaToken} />
          </div>
        )}

        {error && <p className="error-text" style={{ marginTop: 16 }}>{error}</p>}
      </div>

      {/* footer nav */}
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
          <button
            className="btn btn-red"
            style={{ flex: 1 }}
            onClick={handleSubmit}
            disabled={submitting || !consent || (!!TURNSTILE_SITE_KEY && !captchaToken)}
          >
            {submitting ? 'กำลังส่ง…' : 'ส่งใบสมัคร ✓'}
          </button>
        )}
      </div>
    </div>
  );
}
