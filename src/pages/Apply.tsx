import { useEffect, useState } from 'react';
import { fetchPrograms, submitApplication, type Program, type ApplyPayload } from '../lib/api';
import { fileToBase64 } from '../lib/fileToBase64';
import { CONSENT_VERSION, MAX_DOC_BYTES, MAX_PORTFOLIO_BYTES } from '../config';
import FileUpload from '../components/FileUpload';

interface FormState {
  programId: string;
  positionApplied: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  lineUserId: string;
  university: string;
  faculty: string;
  major: string;
  gpa: string;
  yearLevel: string;
  expectedGradYear: string;
}

const EMPTY: FormState = {
  programId: '',
  positionApplied: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  lineUserId: '',
  university: '',
  faculty: '',
  major: '',
  gpa: '',
  yearLevel: '',
  expectedGradYear: '',
};

// หน้าฟอร์มสมัคร + upload ไฟล์ + PDPA consent
export default function Apply() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [resume, setResume] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<File | null>(null);
  const [portfolio, setPortfolio] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ trackingCode: string } | null>(null);

  useEffect(() => {
    fetchPrograms().then((r) => {
      if (r.ok && r.programs) {
        setPrograms(r.programs);
        if (r.programs.length === 1) setForm((f) => ({ ...f, programId: r.programs![0].programId }));
      }
    });
  }, []);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): string | null {
    if (!form.programId) return 'กรุณาเลือกโครงการ';
    if (!form.firstName || !form.lastName) return 'กรุณากรอกชื่อ-นามสกุล';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return 'อีเมลไม่ถูกต้อง';
    if (!form.phone) return 'กรุณากรอกเบอร์โทร';
    if (!form.university || !form.faculty) return 'กรุณากรอกมหาวิทยาลัยและคณะ';
    if (form.gpa && (Number(form.gpa) < 0 || Number(form.gpa) > 4)) return 'GPA ต้องอยู่ระหว่าง 0–4';
    if (!resume) return 'กรุณาแนบ Resume';
    if (!consent) return 'กรุณายอมรับเงื่อนไข PDPA ก่อนส่งใบสมัคร';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    try {
      const payload: ApplyPayload = {
        programId: form.programId,
        positionApplied: form.positionApplied,
        personal: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          lineUserId: form.lineUserId,
        },
        education: {
          university: form.university,
          faculty: form.faculty,
          major: form.major,
          gpa: form.gpa,
          yearLevel: form.yearLevel,
          expectedGradYear: form.expectedGradYear,
        },
        consent: { accepted: consent, version: CONSENT_VERSION },
        files: {
          resume: resume ? await fileToBase64(resume) : undefined,
          transcript: transcript ? await fileToBase64(transcript) : undefined,
          portfolio: portfolio.length ? await Promise.all(portfolio.map(fileToBase64)) : undefined,
        },
      };

      const res = await submitApplication(payload);
      if (res.ok) setResult({ trackingCode: res.trackingCode });
      else setError('ส่งใบสมัครไม่สำเร็จ: ' + (res.error || 'unknown'));
    } catch (err) {
      setError('เกิดข้อผิดพลาด: ' + String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="page">
        <div className="success-card">
          <h1>✅ ส่งใบสมัครสำเร็จ</h1>
          <p>รหัสติดตามใบสมัครของคุณคือ</p>
          <p className="tracking-code">{result.trackingCode}</p>
          <p className="muted">
            กรุณาบันทึกรหัสนี้ไว้ ใช้คู่กับอีเมลเพื่อติดตามสถานะที่หน้า "ติดตามใบสมัคร"
          </p>
          <a className="btn btn-primary" href={`#/track`}>
            ไปหน้าติดตามใบสมัคร
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="hero hero-sm">
        <h1>สมัครฝึกงาน</h1>
        <p className="lead">กรอกข้อมูลให้ครบถ้วนและแนบเอกสารประกอบ</p>
      </section>

      <form className="form" onSubmit={handleSubmit}>
        <fieldset>
          <legend>โครงการ</legend>
          <div className="field">
            <label className="field-label">
              เลือกโครงการ <span className="req">*</span>
            </label>
            <select value={form.programId} onChange={(e) => set('programId', e.target.value)}>
              <option value="">— เลือกโครงการ —</option>
              {programs.map((p) => (
                <option key={p.programId} value={p.programId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">ตำแหน่งที่สนใจ</label>
            <input
              value={form.positionApplied}
              onChange={(e) => set('positionApplied', e.target.value)}
              placeholder="เช่น Operations Intern"
            />
          </div>
        </fieldset>

        <fieldset>
          <legend>ข้อมูลส่วนตัว</legend>
          <div className="grid-2">
            <div className="field">
              <label className="field-label">
                ชื่อ <span className="req">*</span>
              </label>
              <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">
                นามสกุล <span className="req">*</span>
              </label>
              <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">
                อีเมล <span className="req">*</span>
              </label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">
                เบอร์โทร <span className="req">*</span>
              </label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">LINE User ID</label>
              <input value={form.lineUserId} onChange={(e) => set('lineUserId', e.target.value)} />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>ข้อมูลการศึกษา</legend>
          <div className="grid-2">
            <div className="field">
              <label className="field-label">
                มหาวิทยาลัย <span className="req">*</span>
              </label>
              <input value={form.university} onChange={(e) => set('university', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">
                คณะ <span className="req">*</span>
              </label>
              <input value={form.faculty} onChange={(e) => set('faculty', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">สาขา</label>
              <input value={form.major} onChange={(e) => set('major', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">GPA</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={form.gpa}
                onChange={(e) => set('gpa', e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label">ชั้นปี</label>
              <input
                type="number"
                min="1"
                max="8"
                value={form.yearLevel}
                onChange={(e) => set('yearLevel', e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label">ปีที่คาดว่าจะจบ</label>
              <input
                type="number"
                value={form.expectedGradYear}
                onChange={(e) => set('expectedGradYear', e.target.value)}
                placeholder="เช่น 2027"
              />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>เอกสารประกอบ</legend>
          <FileUpload
            label="Resume (PDF)"
            required
            maxBytes={MAX_DOC_BYTES}
            hint="ไฟล์ PDF เท่านั้น"
            onChange={(files) => setResume(files[0] || null)}
          />
          <FileUpload
            label="Transcript (PDF)"
            maxBytes={MAX_DOC_BYTES}
            hint="ไฟล์ PDF เท่านั้น"
            onChange={(files) => setTranscript(files[0] || null)}
          />
          <FileUpload
            label="Portfolio (แนบได้หลายไฟล์)"
            accept=".pdf,.png,.jpg,.jpeg"
            multiple
            maxBytes={MAX_PORTFOLIO_BYTES}
            hint="PDF หรือรูปภาพ"
            onChange={setPortfolio}
          />
        </fieldset>

        <fieldset>
          <legend>ความยินยอม (PDPA)</legend>
          <label className="consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              ข้าพเจ้ายินยอมให้ CP AXTRA (Makro) เก็บ ใช้ และประมวลผลข้อมูลส่วนบุคคลและเอกสารที่แนบ
              เพื่อวัตถุประสงค์ในการพิจารณารับสมัครฝึกงาน ตามนโยบายคุ้มครองข้อมูลส่วนบุคคล
              (เวอร์ชัน {CONSENT_VERSION})
            </span>
          </label>
        </fieldset>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
          {submitting ? 'กำลังส่ง…' : 'ส่งใบสมัคร'}
        </button>
      </form>
    </div>
  );
}
