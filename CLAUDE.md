# CLAUDE.md — OFM Internship Recruitment System

Project memory / decisions for Claude Code. Read before making changes.

## Stack
- Frontend: React + Vite → GitHub Pages (`base: /ofminternship/`, HashRouter)
- Backend: Google Apps Script Web App (`apps-script/`) → Google Sheets + Drive
- Deploy: push/merge to `main` → GitHub Actions (`.github/workflows/deploy.yml`)
- Live: `https://recruitmakrocareer.github.io/ofminternship/` · static prototype at `/prototype/`

## Locked decisions (do NOT change without the user asking)
- **Admin auth = ADMIN_TOKEN only. Do NOT use Google sign-in / OAuth.**
  (User decided against Google sign-in — 2026-08.) Token lives in Apps Script
  Script Properties (`ADMIN_TOKEN`); the admin UI stores it in localStorage
  (`mkr_admin_token`) and every admin endpoint verifies it server-side.
- Program display name comes from the `Programs` sheet (col B), currently
  "Order Fulfillment Internship Program" — not hardcoded in the app.
- Apply form = the design-handoff short/friendly 8-step wizard (v3), not the
  earlier 49-question official form. New fields are stored in the
  `applicationFormJson` blob (Candidates col AE) — core columns unchanged.
- Zero-cost pilot stack (Apps Script + Sheets). No DB migration unless asked.

## Conventions
- All user-facing copy is Thai; lift exact strings from the design handoff.
- Theme tokens + component classes live in `src/styles.css` (dark navy +
  red/gold/cyan). Fonts: Anuphan (headings/UI) + Noto Sans Thai (body).
- Dashboard view prefs persist to localStorage `ofm_admin_view_prefs`.
- Slideshow images: primary source is `LOCAL_SLIDES` in `src/lib/slides.ts`
  (filenames in `public/`); `Programs` col L (`slideImagesJson`, a JSON array of
  full URLs or `public/` filenames) overrides it when non-empty, so art can be
  swapped without a deploy. Never render a slot with no image — no placeholder
  cards. One slide array, one timer: `PromoPane` (desktop ≥1040px) and
  `MobileCarousel` (in Landing) are mounted exclusively by `useIsDesktop()`.
- Slide art spec: 1080 × 1350 (4:5), JPG q80 or WebP, ≤300–500 KB, sRGB.
- Backend `.gs` changes require the user to re-paste in the Apps Script editor
  and Deploy a new version (no clasp in use).

## Optional / not yet done
- Spam protection: Cloudflare Turnstile is wired but opt-in (set
  `VITE_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET`).
- Full PDPA notice page exists at `/#/privacy` (draft text — legal to review).
