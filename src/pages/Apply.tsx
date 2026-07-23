import { useEffect, useState } from 'react';
import { fetchPrograms, submitApplication, type Program, type ApplyPayload } from '../lib/api';
import { fileToBase64 } from '../lib/fileToBase64';
import { CONSENT_VERSION, MAX_DOC_BYTES, MAX_PORTFOLIO_BYTES } from '../config';
import FileUpload from '../components/FileUpload';
import { Field, RadioGroup, CheckboxGroup, RankSelect } from '../components/formFields';
import {
  EMPTY_FORM,
  STEP_TITLES,
  TITLES,
  GENDERS,
  MILITARY_STATUS,
  ADDRESS_MATCH,
  EDU_LEVELS,
  YEAR_LEVELS,
  APPLICATION_TYPES,
  COMPUTER_SKILLS,
  WORK_6DAYS,
  WORK_SHIFT,
  REGION_ABILITY,
  REGIONS,
  FRESH_FOOD_DEPTS,
  VEHICLES,
  NEWS_SOURCES,
  MARKETING_CONSENT,
  type MakroFormData,
} from '../lib/formSchema';

const MAX_10MB = 10 * 1024 * 1024;

// หน้าฟอร์มสมัคร — wizard 8 ขั้นตามแบบฟอร์มทางการ Makro Internship & Co-op
export default function Apply() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [data, setData] = useState<MakroFormData>(EMPTY_FORM);
  const [photo, setPhoto] = useState<File | null>(null);
  const [resume, setResume] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<File | null>(null);
  const [coopLetter, setCoopLetter] = useState<File | null>(null);
  const [portfolio, setPortfolio] = useState<File[]>([]);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ trackingCode: string } | null>(null);

  useEffect(() => {
    fetchPrograms().then((r) => {
      if (r.ok && r.programs) {
        setPrograms(r.programs);
        if (r.programs.length === 1) upd('programId', r.programs[0].programId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function upd<K extends keyof MakroFormData>(key: K, value: MakroFormData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  const isMale = data.gender === 'ชาย';

  // ตรวจความครบของแต่ละ step — คืน string error หรือ null
  function validateStep(s: number): string | null {
    const d = data;
    if (s === 0) {
      if (!d.programId) return 'กรุณาเลือกโครงการ';
      if (!d.title || (d.title === 'อื่น ๆ' && !d.titleOther.trim())) return 'กรุณาเลือกคำนำหน้าชื่อ';
      if (!d.firstNameTh.trim() || !d.lastNameTh.trim()) return 'กรุณากรอกชื่อ–นามสกุล (ภาษาไทย)';
      if (!d.firstNameEn.trim() || !d.lastNameEn.trim()) return 'กรุณากรอกชื่อ–นามสกุล (ภาษาอังกฤษ)';
      if (!d.nickname.trim()) return 'กรุณากรอกชื่อเล่น';
      if (!d.dob) return 'กรุณาระบุวันเดือนปีเกิด';
      if (!d.gender) return 'กรุณาเลือกเพศ';
      if (isMale && !d.militaryStatus) return 'กรุณาเลือกสถานะทางทหาร';
      if (!/^\d{10}$/.test(d.phone)) return 'หมายเลขโทรศัพท์ต้องเป็นตัวเลข 10 หลัก';
      if (!d.lineId.trim()) return 'กรุณากรอก Line ID';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return 'อีเมลไม่ถูกต้อง';
      if (d.nationalId && !/^\d{13}$/.test(d.nationalId)) return 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก';
      if (!d.idCardAddress.trim()) return 'กรุณากรอกที่อยู่ตามบัตรประชาชน';
      if (!d.currentAddressMatch) return 'กรุณาระบุว่าที่อยู่ปัจจุบันตรงกับบัตรหรือไม่';
      if (d.currentAddressMatch === 'ไม่ตรงกัน' && !d.currentAddress.trim()) return 'กรุณากรอกที่อยู่ปัจจุบัน';
    }
    if (s === 1) {
      if (!d.eduLevel) return 'กรุณาเลือกระดับการศึกษา';
      if (!d.institution.trim()) return 'กรุณากรอกชื่อสถาบันการศึกษา';
      if (!d.faculty.trim()) return 'กรุณากรอกคณะ/วิทยาลัย';
      if (!d.major.trim()) return 'กรุณากรอกสาขาวิชา';
      if (!d.yearLevel) return 'กรุณาเลือกชั้นปี';
      if (!d.gpax || Number(d.gpax) < 0 || Number(d.gpax) > 4) return 'GPAX ต้องอยู่ระหว่าง 0.00–4.00';
      if (!d.gradMonthYear) return 'กรุณาระบุวันที่คาดว่าจะสำเร็จการศึกษา';
      if (!d.applicationType) return 'กรุณาเลือกประเภทการสมัคร';
      if (!d.availableStart || !d.availableEnd) return 'กรุณาระบุช่วงเวลาที่สามารถปฏิบัติงานได้';
    }
    if (s === 2) {
      if (!d.coordinatorName.trim()) return 'กรุณากรอกชื่ออาจารย์/เจ้าหน้าที่ผู้ประสานงาน';
      if (!/^\d{9,10}$/.test(d.coordinatorPhone)) return 'เบอร์ผู้ประสานงานไม่ถูกต้อง';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.coordinatorEmail)) return 'อีเมลผู้ประสานงานไม่ถูกต้อง';
    }
    if (s === 3) {
      if (!d.activities.trim()) return 'กรุณากรอกกิจกรรม/ประสบการณ์';
      if (!d.motivation.trim()) return 'กรุณาแนะนำตัวและอธิบายเหตุผลที่สนใจ';
    }
    if (s === 4) {
      if (!d.work6days) return 'กรุณาตอบเรื่องการปฏิบัติงาน 6 วัน/สัปดาห์';
      if (!d.workShift) return 'กรุณาตอบเรื่องการปฏิบัติงานเป็นกะ';
      if (d.workShift === 'มีข้อจำกัดด้านเวลา' && !d.workShiftLimit.trim()) return 'กรุณาระบุข้อจำกัดด้านเวลา';
      if (!d.regionAbility) return 'กรุณาตอบเรื่องการปฏิบัติงานต่างภูมิภาค';
      if (d.regions.length === 0) return 'กรุณาเลือกภูมิภาคที่สะดวกอย่างน้อย 1';
      if (!d.province1.trim()) return 'กรุณาระบุจังหวัดอย่างน้อย 1 จังหวัด';
      if (d.freshFoodRank.length === 0) return 'กรุณาเลือก/เรียงลำดับความสนใจแผนกอาหารสด';
    }
    if (s === 5) {
      if (!photo) return 'กรุณาแนบรูปถ่ายหน้าตรง';
      if (!resume) return 'กรุณาแนบ Resume';
      if (!transcript) return 'กรุณาแนบ Transcript';
    }
    if (s === 6) {
      if (d.newsSources.length === 0) return 'กรุณาเลือกช่องทางที่ทราบข่าว';
    }
    if (s === 7) {
      if (!d.certifyAccuracy) return 'กรุณายืนยันความถูกต้องของข้อมูล';
      if (!d.acknowledgePrivacy) return 'กรุณารับทราบประกาศความเป็นส่วนตัว';
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function back() {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit() {
    // ตรวจทุก step ก่อนส่ง
    for (let s = 0; s <= 7; s++) {
      const err = validateStep(s);
      if (err) {
        setStep(s);
        setError(err);
        return;
      }
    }
    setSubmitting(true);
    setError('');
    try {
      const payload: ApplyPayload = {
        programId: data.programId,
        positionApplied: data.applicationType,
        personal: {
          firstName: data.firstNameTh,
          lastName: data.lastNameTh,
          email: data.email,
          phone: data.phone,
          lineUserId: data.lineId,
        },
        education: {
          university: data.institution,
          faculty: data.faculty,
          major: data.major,
          gpa: data.gpax,
          yearLevel: data.yearLevel,
          expectedGradYear: data.gradMonthYear,
        },
        consent: { accepted: data.certifyAccuracy && data.acknowledgePrivacy, version: CONSENT_VERSION },
        files: {
          photo: photo ? await fileToBase64(photo) : undefined,
          resume: resume ? await fileToBase64(resume) : undefined,
          transcript: transcript ? await fileToBase64(transcript) : undefined,
          coopLetter: coopLetter ? await fileToBase64(coopLetter) : undefined,
          portfolio: portfolio.length ? await Promise.all(portfolio.map(fileToBase64)) : undefined,
        },
        form: { ...data }, // เก็บคำตอบทั้งหมดเป็น JSON
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
          <p>บริษัทได้รับใบสมัครของท่านเรียบร้อยแล้ว รหัสติดตามคือ</p>
          <p className="tracking-code">{result.trackingCode}</p>
          <p className="muted">
            ทีม Talent Acquisition จะติดต่อผู้ที่ผ่านการพิจารณาเบื้องต้นผ่านโทรศัพท์ / Email / Line ID ที่ระบุไว้
            กรุณาบันทึกรหัสนี้เพื่อติดตามสถานะ
          </p>
          <a className="btn btn-primary" href="#/track">
            ไปหน้าติดตามใบสมัคร
          </a>
        </div>
      </div>
    );
  }

  const pct = Math.round(((step + 1) / STEP_TITLES.length) * 100);

  return (
    <div className="page">
      <section className="hero hero-sm">
        <h1>สมัครเข้าร่วมโครงการ</h1>
        <p className="lead">Makro Internship &amp; Cooperative Education Program</p>
      </section>

      {/* progress */}
      <div className="wizard-progress">
        <div className="wizard-bar">
          <div className="wizard-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="wizard-step-label">
          ส่วนที่ {step + 1}/{STEP_TITLES.length}: <strong>{STEP_TITLES[step]}</strong>
        </p>
      </div>

      <div className="form">
        {/* ===== STEP 0: ข้อมูลส่วนบุคคล ===== */}
        {step === 0 && (
          <fieldset>
            <legend>ส่วนที่ 1 · ข้อมูลส่วนบุคคล</legend>

            <Field label="โครงการที่สมัคร" required>
              <select value={data.programId} onChange={(e) => upd('programId', e.target.value)}>
                <option value="">— เลือกโครงการ —</option>
                {programs.map((p) => (
                  <option key={p.programId} value={p.programId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>

            <RadioGroup label="1. คำนำหน้าชื่อ" required options={TITLES} value={data.title} onChange={(v) => upd('title', v)} />
            {data.title === 'อื่น ๆ' && (
              <Field label="โปรดระบุคำนำหน้า" required>
                <input value={data.titleOther} onChange={(e) => upd('titleOther', e.target.value)} />
              </Field>
            )}

            <div className="grid-2">
              <Field label="2. ชื่อ (ภาษาไทย)" required example="ธนวัฒน์">
                <input value={data.firstNameTh} onChange={(e) => upd('firstNameTh', e.target.value)} />
              </Field>
              <Field label="นามสกุล (ภาษาไทย)" required example="ใจดี">
                <input value={data.lastNameTh} onChange={(e) => upd('lastNameTh', e.target.value)} />
              </Field>
              <Field label="3. ชื่อ (ภาษาอังกฤษ)" required example="Thanawat">
                <input value={data.firstNameEn} onChange={(e) => upd('firstNameEn', e.target.value)} />
              </Field>
              <Field label="นามสกุล (ภาษาอังกฤษ)" required example="Jaidee">
                <input value={data.lastNameEn} onChange={(e) => upd('lastNameEn', e.target.value)} />
              </Field>
              <Field label="4. ชื่อเล่น" required example="แบงค์">
                <input value={data.nickname} onChange={(e) => upd('nickname', e.target.value)} />
              </Field>
              <Field label="5. วันเดือนปีเกิด" required>
                <input type="date" value={data.dob} onChange={(e) => upd('dob', e.target.value)} />
              </Field>
            </div>

            <RadioGroup label="6. เพศ" required options={GENDERS} value={data.gender} onChange={(v) => upd('gender', v)} />

            {isMale && (
              <RadioGroup
                label="7. สถานะทางทหาร"
                required
                hint="สำหรับผู้สมัครเพศชาย"
                options={MILITARY_STATUS}
                value={data.militaryStatus}
                onChange={(v) => upd('militaryStatus', v)}
              />
            )}

            <div className="grid-2">
              <Field label="8. หมายเลขโทรศัพท์มือถือ" required hint="ตัวเลข 10 หลัก ไม่ต้องมีขีด" example="0812345678">
                <input inputMode="numeric" value={data.phone} onChange={(e) => upd('phone', e.target.value.replace(/\D/g, ''))} maxLength={10} />
              </Field>
              <Field label="9. Line ID" required example="thanawat123">
                <input value={data.lineId} onChange={(e) => upd('lineId', e.target.value)} />
              </Field>
              <Field label="10. Email" required example="thanawat.jaidee@email.com">
                <input type="email" value={data.email} onChange={(e) => upd('email', e.target.value)} />
              </Field>
              <Field label="11. เลขบัตรประชาชน" hint="ไม่บังคับในขั้นนี้ · ตัวเลข 13 หลัก" example="1234567890123">
                <input inputMode="numeric" value={data.nationalId} onChange={(e) => upd('nationalId', e.target.value.replace(/\D/g, ''))} maxLength={13} />
              </Field>
              <Field label="12. น้ำหนัก (กก.)" hint="ไม่บังคับ">
                <input inputMode="numeric" value={data.weight} onChange={(e) => upd('weight', e.target.value)} />
              </Field>
              <Field label="13. ส่วนสูง (ซม.)" hint="ไม่บังคับ">
                <input inputMode="numeric" value={data.height} onChange={(e) => upd('height', e.target.value)} />
              </Field>
            </div>

            <Field label="14. ที่อยู่ตามบัตรประชาชน" required hint="บ้านเลขที่ หมู่ ซอย ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด รหัสไปรษณีย์">
              <textarea rows={3} value={data.idCardAddress} onChange={(e) => upd('idCardAddress', e.target.value)} />
            </Field>

            <RadioGroup
              label="15. ที่อยู่ปัจจุบันตรงกับบัตรประชาชนหรือไม่"
              required
              options={ADDRESS_MATCH}
              value={data.currentAddressMatch}
              onChange={(v) => upd('currentAddressMatch', v)}
            />
            {data.currentAddressMatch === 'ไม่ตรงกัน' && (
              <Field label="กรุณาระบุที่อยู่ปัจจุบัน" required>
                <textarea rows={3} value={data.currentAddress} onChange={(e) => upd('currentAddress', e.target.value)} />
              </Field>
            )}
          </fieldset>
        )}

        {/* ===== STEP 1: การศึกษา ===== */}
        {step === 1 && (
          <fieldset>
            <legend>ส่วนที่ 2 · ข้อมูลการศึกษา</legend>
            <RadioGroup label="16. ระดับการศึกษาปัจจุบัน" required options={EDU_LEVELS} value={data.eduLevel} onChange={(v) => upd('eduLevel', v)} />
            <div className="grid-2">
              <Field label="17. ชื่อสถาบันการศึกษา" required hint="ชื่อเต็ม ไม่ใช้ตัวย่อ" example="มหาวิทยาลัยเทคโนโลยีราชมงคลธัญบุรี">
                <input value={data.institution} onChange={(e) => upd('institution', e.target.value)} />
              </Field>
              <Field label="18. คณะ/วิทยาลัย" required example="คณะเทคโนโลยีการเกษตร">
                <input value={data.faculty} onChange={(e) => upd('faculty', e.target.value)} />
              </Field>
              <Field label="19. สาขาวิชา" required example="วิทยาศาสตร์และเทคโนโลยีการอาหาร">
                <input value={data.major} onChange={(e) => upd('major', e.target.value)} />
              </Field>
              <Field label="21. GPAX (เกรดเฉลี่ยสะสม)" required hint="0.00–4.00" example="3.25">
                <input type="number" step="0.01" min="0" max="4" value={data.gpax} onChange={(e) => upd('gpax', e.target.value)} />
              </Field>
            </div>
            <RadioGroup label="20. ชั้นปีปัจจุบัน" required options={YEAR_LEVELS} value={data.yearLevel} onChange={(v) => upd('yearLevel', v)} />
            <Field label="22. วันที่คาดว่าจะสำเร็จการศึกษา" required hint="เดือน/ปี">
              <input type="month" value={data.gradMonthYear} onChange={(e) => upd('gradMonthYear', e.target.value)} />
            </Field>
            <RadioGroup label="23. ประเภทการสมัคร" required options={APPLICATION_TYPES} value={data.applicationType} onChange={(v) => upd('applicationType', v)} />
            <div className="grid-2">
              <Field label="24. วันที่เริ่มปฏิบัติงานได้" required>
                <input type="date" value={data.availableStart} onChange={(e) => upd('availableStart', e.target.value)} />
              </Field>
              <Field label="วันที่สิ้นสุด" required>
                <input type="date" value={data.availableEnd} onChange={(e) => upd('availableEnd', e.target.value)} />
              </Field>
            </div>
          </fieldset>
        )}

        {/* ===== STEP 2: ผู้ประสานงาน ===== */}
        {step === 2 && (
          <fieldset>
            <legend>ส่วนที่ 3 · ผู้ประสานงานของสถาบันการศึกษา</legend>
            <Field label="25. ชื่อ–นามสกุล อาจารย์ที่ปรึกษา/เจ้าหน้าที่สหกิจ" required example="อาจารย์ ดร. สมชาย ใจดี">
              <input value={data.coordinatorName} onChange={(e) => upd('coordinatorName', e.target.value)} />
            </Field>
            <Field label="26. ตำแหน่ง" hint="ไม่บังคับ" example="อาจารย์ที่ปรึกษาสหกิจศึกษา">
              <input value={data.coordinatorPosition} onChange={(e) => upd('coordinatorPosition', e.target.value)} />
            </Field>
            <div className="grid-2">
              <Field label="27. หมายเลขโทรศัพท์ผู้ประสานงาน" required example="0812345678">
                <input inputMode="numeric" value={data.coordinatorPhone} onChange={(e) => upd('coordinatorPhone', e.target.value.replace(/\D/g, ''))} maxLength={10} />
              </Field>
              <Field label="28. Email ผู้ประสานงาน" required example="somchai@university.ac.th">
                <input type="email" value={data.coordinatorEmail} onChange={(e) => upd('coordinatorEmail', e.target.value)} />
              </Field>
            </div>
          </fieldset>
        )}

        {/* ===== STEP 3: กิจกรรม/ทักษะ ===== */}
        {step === 3 && (
          <fieldset>
            <legend>ส่วนที่ 4 · กิจกรรม ประสบการณ์ และทักษะ</legend>
            <Field label="29. กิจกรรมระหว่างเรียนและประสบการณ์ที่ผ่านมา" required hint="ระบุได้มากกว่า 1 กิจกรรม (บทบาท/ความรับผิดชอบ)">
              <textarea rows={5} value={data.activities} onChange={(e) => upd('activities', e.target.value)} />
            </Field>
            <Field label="30. ทักษะทางภาษา" hint="ไม่บังคับ · ระบุภาษา ระดับ และคะแนน/ใบรับรอง หากมี">
              <textarea rows={3} value={data.languages} onChange={(e) => upd('languages', e.target.value)} />
            </Field>
            <CheckboxGroup
              label="31. ทักษะคอมพิวเตอร์/โปรแกรมที่ใช้งานได้"
              hint="เลือกได้มากกว่า 1"
              options={COMPUTER_SKILLS}
              values={data.computerSkills}
              onChange={(v) => upd('computerSkills', v)}
            />
            {data.computerSkills.includes('อื่น ๆ') && (
              <Field label="โปรดระบุโปรแกรมอื่น ๆ">
                <input value={data.computerSkillsOther} onChange={(e) => upd('computerSkillsOther', e.target.value)} />
              </Field>
            )}
            <Field label="32. ทักษะ/ความสามารถพิเศษอื่น ๆ" hint="ไม่บังคับ" example="การนำเสนอ การขาย การถ่ายภาพ การตัดต่อวิดีโอ">
              <textarea rows={3} value={data.specialSkills} onChange={(e) => upd('specialSkills', e.target.value)} />
            </Field>
            <Field label="33. แนะนำตัวและเหตุผลที่สนใจเข้าร่วมโครงการ" required hint="แรงจูงใจ สิ่งที่อยากเรียนรู้ เป้าหมาย (แนะนำ 100–300 คำ)">
              <textarea rows={6} value={data.motivation} onChange={(e) => upd('motivation', e.target.value)} />
            </Field>
          </fieldset>
        )}

        {/* ===== STEP 4: ความพร้อม ===== */}
        {step === 4 && (
          <fieldset>
            <legend>ส่วนที่ 5 · ความพร้อมในการปฏิบัติงาน</legend>
            <RadioGroup label="34. ปฏิบัติงาน 6 วัน/สัปดาห์ได้หรือไม่" required options={WORK_6DAYS} value={data.work6days} onChange={(v) => upd('work6days', v)} />
            <RadioGroup label="35. ปฏิบัติงานเป็นกะได้หรือไม่" required hint="เวลางานขึ้นกับตารางของแต่ละสาขา/แผนก" options={WORK_SHIFT} value={data.workShift} onChange={(v) => upd('workShift', v)} />
            {data.workShift === 'มีข้อจำกัดด้านเวลา' && (
              <Field label="กรุณาระบุข้อจำกัดด้านเวลา" required>
                <input value={data.workShiftLimit} onChange={(e) => upd('workShiftLimit', e.target.value)} />
              </Field>
            )}
            <RadioGroup label="36. ปฏิบัติงานที่สาขาในภูมิภาคที่บริษัทกำหนดได้หรือไม่" required options={REGION_ABILITY} value={data.regionAbility} onChange={(v) => upd('regionAbility', v)} />
            <CheckboxGroup label="37. ภูมิภาคที่สะดวกปฏิบัติงาน" required hint="เลือกได้มากกว่า 1 (เป็นข้อมูลประกอบการพิจารณา ไม่รับประกันการจัดสาขา)" options={REGIONS} values={data.regions} onChange={(v) => upd('regions', v)} />
            <Field label="38. จังหวัดที่สะดวกปฏิบัติงาน" required hint="ระบุได้สูงสุด 3 จังหวัด เรียงตามความสะดวก">
              <div className="grid-3">
                <input placeholder="จังหวัดลำดับ 1" value={data.province1} onChange={(e) => upd('province1', e.target.value)} />
                <input placeholder="จังหวัดลำดับ 2" value={data.province2} onChange={(e) => upd('province2', e.target.value)} />
                <input placeholder="จังหวัดลำดับ 3" value={data.province3} onChange={(e) => upd('province3', e.target.value)} />
              </div>
            </Field>
            <RankSelect label="39. ความสนใจในแผนกอาหารสด" required options={FRESH_FOOD_DEPTS} value={data.freshFoodRank} onChange={(v) => upd('freshFoodRank', v)} />
            <RadioGroup label="40. พาหนะส่วนตัว" hint="ไม่บังคับ" options={VEHICLES} value={data.vehicle} onChange={(v) => upd('vehicle', v)} />
            {data.vehicle === 'อื่น ๆ' && (
              <Field label="โปรดระบุพาหนะ">
                <input value={data.vehicleOther} onChange={(e) => upd('vehicleOther', e.target.value)} />
              </Field>
            )}
          </fieldset>
        )}

        {/* ===== STEP 5: เอกสาร ===== */}
        {step === 5 && (
          <fieldset>
            <legend>ส่วนที่ 6 · เอกสารประกอบการสมัคร</legend>
            <FileUpload
              label="รูปถ่ายหน้าตรง"
              required
              accept=".jpg,.jpeg,.png"
              maxBytes={MAX_DOC_BYTES}
              hint="JPG/JPEG/PNG · เห็นใบหน้าชัด แต่งกายสุภาพ พื้นหลังเรียบ ไม่สวมหมวก/แว่นกันแดด ไม่มีบุคคลอื่นในภาพ (ใช้เพื่อยืนยันตัวตนเท่านั้น)"
              onChange={(f) => setPhoto(f[0] || null)}
            />
            <FileUpload label="41. Resume / ประวัติส่วนตัว" required accept=".pdf,.doc,.docx" maxBytes={MAX_10MB} hint="PDF, DOC หรือ DOCX" onChange={(f) => setResume(f[0] || null)} />
            <FileUpload label="42. Transcript / ผลการศึกษาล่าสุด" required accept=".pdf,.jpg,.jpeg,.png" maxBytes={MAX_10MB} hint="PDF, JPG หรือ PNG" onChange={(f) => setTranscript(f[0] || null)} />
            <FileUpload label="43. หนังสือขอความอนุเคราะห์ฝึกงาน/สหกิจ" accept=".pdf,.jpg,.jpeg,.png" maxBytes={MAX_10MB} hint="PDF, JPG หรือ PNG · ส่งภายหลังได้ถ้ายังไม่ออกเอกสาร" onChange={(f) => setCoopLetter(f[0] || null)} />
            <FileUpload label="44. Portfolio / เอกสารประกอบอื่น ๆ" accept=".pdf" multiple maxBytes={MAX_PORTFOLIO_BYTES} hint="PDF" onChange={setPortfolio} />
          </fieldset>
        )}

        {/* ===== STEP 6: ช่องทางข่าวสาร ===== */}
        {step === 6 && (
          <fieldset>
            <legend>ส่วนที่ 7 · ช่องทางการรับทราบข่าวสาร</legend>
            <CheckboxGroup label="45. ทราบข่าวการรับสมัครจากช่องทางใด" required hint="เลือกได้มากกว่า 1" options={NEWS_SOURCES} values={data.newsSources} onChange={(v) => upd('newsSources', v)} />
            {data.newsSources.includes('อื่น ๆ') && (
              <Field label="โปรดระบุช่องทางอื่น ๆ">
                <input value={data.newsSourceOther} onChange={(e) => upd('newsSourceOther', e.target.value)} />
              </Field>
            )}
            <Field label="46. ชื่อสถาบัน กิจกรรม หรือบุคคลที่แนะนำ" hint="ไม่บังคับ" example="งาน Career Day หรือรุ่นพี่ในโครงการ">
              <input value={data.referralDetail} onChange={(e) => upd('referralDetail', e.target.value)} />
            </Field>
          </fieldset>
        )}

        {/* ===== STEP 7: รับรอง/PDPA ===== */}
        {step === 7 && (
          <fieldset>
            <legend>ส่วนที่ 8 · การรับรองข้อมูลและ PDPA</legend>
            <label className="consent">
              <input type="checkbox" checked={data.certifyAccuracy} onChange={(e) => upd('certifyAccuracy', e.target.checked)} />
              <span>
                47. ข้าพเจ้ารับรองว่าข้อมูลและเอกสารที่ให้ไว้ถูกต้องและเป็นความจริง
                หากพบว่าไม่ถูกต้อง บริษัทอาจพิจารณายกเลิกการสมัครหรือการเข้าร่วมโครงการ <span className="req">*</span>
              </span>
            </label>
            <label className="consent">
              <input type="checkbox" checked={data.acknowledgePrivacy} onChange={(e) => upd('acknowledgePrivacy', e.target.checked)} />
              <span>
                48. ข้าพเจ้าได้อ่านและรับทราบประกาศความเป็นส่วนตัวสำหรับผู้สมัครงานและนักศึกษาฝึกงานของบริษัทแล้ว
                (เวอร์ชัน {CONSENT_VERSION}) <span className="req">*</span>
              </span>
            </label>
            <RadioGroup
              label="49. ยินยอมรับข่าวสารโอกาสฝึกงาน/สมัครงานในอนาคต"
              hint="เป็นทางเลือก ไม่มีผลต่อการพิจารณาใบสมัครปัจจุบัน"
              options={MARKETING_CONSENT}
              value={data.marketingConsent}
              onChange={(v) => upd('marketingConsent', v)}
            />
          </fieldset>
        )}

        {error && <p className="error-text">{error}</p>}

        {/* nav */}
        <div className="wizard-nav">
          {step > 0 && (
            <button type="button" className="btn btn-ghost" onClick={back} disabled={submitting}>
              ← ย้อนกลับ
            </button>
          )}
          <span style={{ flex: 1 }} />
          {step < STEP_TITLES.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={next}>
              ถัดไป →
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'กำลังส่ง…' : 'ส่งใบสมัคร'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
