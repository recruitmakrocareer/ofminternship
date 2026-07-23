# CP AXTRA (Makro) — Internship Recruitment Web App

ระบบรับสมัครนักศึกษาฝึกงานครบวงจร (Zero-Cost Pilot) สำหรับทีม Talent Acquisition
สถาปัตยกรรม: **GitHub Pages (React) + Google Apps Script + Google Drive + Google Sheets + Looker Studio**

> Pilot นี้ออกแบบ schema ให้ migrate เข้า Talent Pool / ATS (Supabase หรือ Firebase) ได้ในอนาคต
> โดยไม่ต้องรื้อ data model — ดูรายละเอียดใน `internshipwebappspec.md`

## โครงสร้างโปรเจกต์

```
/                       React + Vite SPA (deploy → GitHub Pages)
  src/pages/            Landing, ProgramJourney, Apply, TrackStatus
  src/admin/            Dashboard, CandidateProfile (token-protected)
  src/components/       FileUpload, JourneyTimeline, StatusStepper
  src/lib/              api.ts, fileToBase64.ts
  src/config.ts         อ่านค่าจาก Vite env (import.meta.env)
/apps-script/           Backend: Code/Apply/AiScreen/Track/Admin/Seed.gs (ดู README ในโฟลเดอร์)
.github/workflows/      deploy.yml (auto build + deploy)
```

## Frontend — dev / build

```bash
npm install
cp .env.example .env.local     # ใส่ VITE_APPS_SCRIPT_URL + VITE_SUBMIT_TOKEN
npm run dev                    # http://localhost:5173
npm run build                  # ออก dist/
```

### ตัวแปรสภาพแวดล้อม (`.env`)

| ตัวแปร | คำอธิบาย |
|---|---|
| `VITE_APPS_SCRIPT_URL` | URL `/exec` ของ Apps Script Web App |
| `VITE_SUBMIT_TOKEN` | token สาธารณะ (ตรงกับ `SUBMIT_TOKEN` ใน Script Properties) |
| `VITE_LOOKER_STUDIO_URL` | (ไม่บังคับ) ลิงก์ embed Looker Studio |
| `VITE_BASE_PATH` | (ไม่บังคับ) base path — default `/ofminternship/` ; custom domain ใช้ `/` |

> ⚠️ `VITE_SUBMIT_TOKEN` ถูก build เข้า client bundle จึงเป็นแค่ตัวกัน spam ระดับพื้นฐาน
> ไม่ใช่ความลับจริง — `ADMIN_TOKEN` และ `GEMINI_API_KEY` อยู่ที่ backend เท่านั้น (ห้ามใส่ในฝั่ง frontend)

## Deploy (GitHub Pages)

1. เปิด **Settings → Pages → Build and deployment → Source = GitHub Actions**
2. ตั้งค่า **Settings → Secrets and variables → Actions**
   - Variables: `VITE_APPS_SCRIPT_URL`, `VITE_BASE_PATH`, `VITE_LOOKER_STUDIO_URL`
   - Secrets: `VITE_SUBMIT_TOKEN`
3. push เข้า `main` → workflow `deploy.yml` build + deploy อัตโนมัติ

## Backend

ดูขั้นตอนตั้งค่า Sheet/Drive/Script Properties, deploy Web App และทดสอบด้วย curl ที่
[`apps-script/README.md`](apps-script/README.md)

## สถานะใบสมัคร (lifecycle)

`submitted → prescreened → shortlisted → interview → offer → accepted`
(แยก `rejected` / `declined` / `failed`) — ตรงกับ spec ข้อ 3

## Security & PDPA (สรุป)

- บังคับ consent PDPA ก่อน submit + เก็บ version/timestamp
- ไฟล์ผู้สมัครเก็บใน **Shared Drive** เท่านั้น
- Token 2 ชุดแยกกัน (`SUBMIT_TOKEN` / `ADMIN_TOKEN`)
- ติดตามสถานะต้องยืนยัน email ให้ตรงกับผู้สมัคร
- ไม่ hardcode secret — ใช้ Script Properties (backend) + env (frontend)
