# Apps Script Backend — Internship Recruitment

Backend ทั้งหมดของระบบรับสมัครฝึกงาน รันบน **Google Apps Script Web App**
(endpoint `doPost` / `doGet`) เชื่อม Google Sheets + Google Drive (Shared Drive) + Gemini API

## ไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `Code.gs` | Router (`doPost`/`doGet`), config จาก Script Properties, ตำแหน่งคอลัมน์ตาม schema |
| `Apply.gs` | `handleApply` — สร้าง Candidate + Application + เซฟไฟล์, running sequence สำหรับ tracking code |
| `AiScreen.gs` | `runAiScreen` (Gemini OCR + screening), `screenPendingBatch` (time-driven trigger), `retryScreen` |
| `Track.gs` | `handleTrack` (public + email verify), `listPrograms`, `findRow`/`findRowIndex` |
| `Admin.gs` | `getCandidate`, `listCandidates`, `updateApplicationStatus`, mapper `rowToCandidate`/`rowToApplication` |
| `Seed.gs` | (P1) `setupSheets` สร้าง header 3 แท็บ, `seedProgram` ใส่โครงการตัวอย่าง |
| `Maintenance.gs` | `runRetention` (ตั้ง time-driven trigger รายเดือน) — ย้ายโฟลเดอร์ผู้สมัครที่ไม่ผ่าน + เก่ากว่า `RETENTION_MONTHS` ไป `_archive/` |

## Production hardening (มีในโค้ดแล้ว)

- **Validation ฝั่ง server** — `validateApplyPayload` ตรวจอีเมล/เบอร์/GPAX/ฟิลด์บังคับ (ไม่เชื่อ frontend อย่างเดียว)
- **กันใบสมัครซ้ำ** — อีเมลเดิม + โครงการเดิม → คืน `{ok:false, error:'duplicate', trackingCode}`
- **Spam protection** — ตั้ง `TURNSTILE_SECRET` เพื่อบังคับตรวจ Cloudflare Turnstile (ไม่ตั้ง = ข้าม)
- **แจ้งเตือน TA** — ตั้ง `TA_NOTIFY_EMAIL` เพื่อรับอีเมลสรุปทุกใบสมัครใหม่
- **Data retention** — `runRetention` (ตั้ง trigger) ย้ายไฟล์ผู้สมัครที่ไม่ผ่านเข้า `_archive/` ตาม `RETENTION_MONTHS`

> ตั้ง **Cloudflare Turnstile** ฟรีที่ dash.cloudflare.com → Turnstile → สร้าง widget → ได้ **site key** (ใส่ `VITE_TURNSTILE_SITE_KEY`) + **secret** (ใส่ `TURNSTILE_SECRET`)
| `appsscript.json` | manifest — timezone, web app access, OAuth scopes |

## P1 — Setup (ทำในบัญชี Google Workspace ขององค์กร)

1. สร้าง **Spreadsheet** 1 ไฟล์ (จะสร้าง 3 แท็บอัตโนมัติด้วย `setupSheets`)
2. สร้าง **Shared Drive** `Internship-Recruitment-2026/` → โฟลเดอร์ `applicants/`
3. สร้าง **Apps Script project** แล้ววางไฟล์ `.gs` ทั้งหมด (หรือใช้ `clasp push` ดูด้านล่าง)
4. ไปที่ **Project Settings → Script Properties** ตั้งค่า:

   | Key | ค่า |
   |---|---|
   | `SHEET_ID` | id ของ Spreadsheet |
   | `DRIVE_FOLDER_ID` | id ของโฟลเดอร์ `applicants/` ใน Shared Drive |
   | `SUBMIT_TOKEN` | สุ่ม string (ใช้ในฟอร์มสาธารณะ) |
   | `ADMIN_TOKEN` | สุ่ม string อีกชุด (แยกจาก submit) |
   | `GEMINI_API_KEY` | key จาก Google AI Studio |
   | `GEMINI_MODEL` | (ไม่บังคับ) เช่น `gemini-2.5-flash` |
   | `TURNSTILE_SECRET` | (ไม่บังคับ) secret ของ Cloudflare Turnstile — เปิด spam protection (ตั้งคู่กับ `VITE_TURNSTILE_SITE_KEY` ฝั่ง frontend) |
   | `TA_NOTIFY_EMAIL` | (ไม่บังคับ) อีเมลทีม TA รับแจ้งเตือนใบสมัครใหม่ |
   | `RETENTION_MONTHS` | (ไม่บังคับ) เก็บข้อมูลผู้สมัครที่ไม่ผ่านกี่เดือน (default 12) |

5. รัน `setupSheets` แล้ว `seedProgram` หนึ่งครั้งจาก editor (Authorize สิทธิ์ตอนถาม)

## Deploy Web App

- **Deploy → New deployment → Web app**
- **Execute as:** `Me`
- **Who has access:** `Anyone`
- คัดลอก **`/exec` URL** ไปใส่ใน frontend (`VITE_APPS_SCRIPT_URL`)
- ⚠️ ทุกครั้งที่แก้โค้ดต้อง **New deployment** (หรือ Manage deployments → แก้เป็นเวอร์ชันใหม่) ถึงจะมีผล

### ใช้ clasp (ทางเลือก — push จากเครื่องที่มี credential)

```bash
npm install -g @google/clasp
clasp login
cp .clasp.json.example .clasp.json   # แล้วใส่ scriptId ของโปรเจกต์
clasp push
clasp deploy --description "v1"
```

## AI screening: inline vs trigger (P4)

- ค่า default รัน AI ใน `doPost` เลย (execution เดียว)
- ถ้า Resume ใหญ่/ช้าจนใกล้ลิมิต 6 นาที → ปิดการเรียก inline แล้วตั้ง **time-driven trigger**
  เรียก `screenPendingBatch` ทุก 5 นาที (สแกน row ที่ `aiStatus = pending/failed`)

## ทดสอบด้วย curl

> ต้องใช้ `Content-Type: text/plain` เท่านั้น (เลี่ยง CORS preflight)

```bash
EXEC_URL="https://script.google.com/macros/s/XXXX/exec"

# 1) ดึงโครงการที่เปิดรับ
curl -s "$EXEC_URL?action=programs"

# 2) ส่งใบสมัคร (payload ย่อ — ไม่มีไฟล์)
curl -s -L -X POST "$EXEC_URL" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d '{
    "token": "YOUR_SUBMIT_TOKEN",
    "action": "apply",
    "payload": {
      "programId": "PROG-OPS-2026",
      "positionApplied": "Operations Intern",
      "personal": {"firstName":"สมชาย","lastName":"ใจดี","email":"test@example.com","phone":"0800000000"},
      "education": {"university":"จุฬาฯ","faculty":"บริหารธุรกิจ","major":"การตลาด","gpa":3.5,"yearLevel":3,"expectedGradYear":2027},
      "consent": {"accepted": true, "version": "2026-v1"},
      "files": {}
    }
  }'

# 3) ติดตามสถานะ (ต้องใส่ email ให้ตรง)
curl -s "$EXEC_URL?action=track&trackingCode=MKR-INT-2026-0001&email=test@example.com"

# 4) แอดมิน — list / candidate / เปลี่ยนสถานะ
curl -s "$EXEC_URL?action=list&adminToken=YOUR_ADMIN_TOKEN"
curl -s "$EXEC_URL?action=candidate&adminToken=YOUR_ADMIN_TOKEN&candidateId=Cxxxxxxxx"
curl -s -L -X POST "$EXEC_URL" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d '{"adminToken":"YOUR_ADMIN_TOKEN","action":"updateStatus","payload":{"trackingCode":"MKR-INT-2026-0001","status":"shortlisted","note":"ผ่านรอบแรก"}}'
```

> หมายเหตุ: ใช้ `-L` เพราะ `/exec` redirect ไป googleusercontent เสมอ
