# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Horizon Skills Academy — a school-management app for a language center in Algeria
(enrollment, attendance, payments, scheduling, Google Sheets backup). Tauri 2 (Rust
shell) + React 19 + TypeScript + Vite, so the same codebase builds to desktop, mobile
(Android/iOS), and PWA.

The backend is Supabase (Postgres + Auth + Realtime); `src/lib/config.ts` is the source of
truth for the runtime mode. Filenames like `fb.ts` / `firebaseSync.ts` are leftover naming
from an earlier Firebase version; they now wrap Supabase.

## Commands

```bash
npm install
npm run dev            # Vite dev server on http://localhost:1420 (demo mode by default)
npm run build           # tsc typecheck + vite build
npm run preview          # preview the production build
npm run tauri dev        # native desktop shell
npm run tauri android dev  # native Android shell (after `npm run tauri android init`)
```

There is no lint script, no test runner, and no test files configured in this repo.
`npm run build` is the closest thing to a correctness check (it runs `tsc` before
`vite build`), and `tsconfig.json` has `strict`, `noUnusedLocals`, `noUnusedParameters`
all on — treat TypeScript errors as build-breaking.

## Demo mode vs. Supabase mode

Runtime mode is decided in `src/lib/config.ts` purely from env vars:

- No `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` → `DEMO_MODE`: everything runs off a
  Zustand store pre-filled by `src/data/seed.ts` and persisted to `localStorage`. Fully
  usable with no backend — this is the default for `npm run dev`.
- Both present → Supabase mode: the store starts empty and is mirrored live from
  Postgres (see below). Copy `.env.example` to `.env` and fill in Supabase project
  values, plus `VITE_OWNER_EMAIL` (the address that auto-becomes admin on first
  sign-in — see `src/data/bootstrap.ts`).

Almost every module in `src/data/` branches on `DEMO_MODE` and no-ops the Supabase side
when it's on. When changing data-layer code, always check the behavior makes sense in
both modes.

## Data layer architecture

`src/data/store.ts` is a single Zustand store holding every collection (students,
teachers, classes, enrollments, sessions, payments, notifications, activityLog,
slotRequests, registrationRequests, teacherPayouts — types in `src/lib/types.ts`,
Postgres table names == `COLLECTIONS` values == store keys). Components read and write
exclusively through this store's actions and never branch on mode themselves — actions
encapsulate the demo/Supabase split:

1. Every store action mutates local Zustand state synchronously (works identically in
   both modes — this is what makes the UI feel instant/offline-first).
2. It also calls `fbWrite` / `fbPatch` / `fbDelete` (`src/data/fb.ts`), which are no-ops
   in `DEMO_MODE` and otherwise enqueue the write into `src/data/outbox.ts`.
3. `outbox.ts` is a durable offline queue: writes persist to `localStorage`, flush to
   Supabase immediately if online, and retry on reconnect / every 15s. A write rejected
   by Supabase (RLS/validation) is dropped rather than retried forever; a network
   failure keeps it queued.
4. `src/data/firebaseSync.ts` (Supabase-mode only) does the initial full fetch of every
   table into the store, then keeps it live via a single `postgres_changes` Realtime
   channel, applying inserts/updates/deletes to the single affected row (never a full
   refetch, to avoid clobbering in-flight optimistic edits).
5. `src/data/sheetSync.ts` mirrors the whole store to a Google Sheets Apps Script
   webhook, debounced 3s, admin-only (only the admin sees all the data). Wired up from
   `AuthContext` based on `role === "admin"`.

Many store actions also create cross-entity side effects worth knowing about before
touching them: e.g. `saveAttendance` auto-generates `Payment` rows for billable
attendance states, `enroll`/`unenroll` manage waiting lists and `ClassRoom.isLocked`,
and most mutating actions call `addNotification` for the affected user(s) and `log` an
`ActivityLog` entry.

Business rules live as pure, side-effect-free functions so they can be tested without a
UI or backend:
- `src/lib/payments.ts` — school/teacher cut split (percentage vs. fixed mode), default
  per-session pricing by school cycle.
- `src/lib/schedule.ts` — the two-part free-slot check (a slot needs both the day/time
  itself free AND the chosen teacher free at that day/time).

## Auth & roles

Three roles: `admin`, `teacher`, `student` (`src/lib/types.ts` `Role`). RBAC is enforced
at the UI level in two places:
- `src/app/navigation.ts` (`NAV_SECTIONS[].items[].roles`) filters the sidebar.
- `src/app/ProtectedRoute.tsx` / route `allow={[...]}` props in `src/App.tsx` guard
  pages.

`src/features/auth/AuthContext.tsx` is the source of truth for auth state and branches
heavily on `DEMO_MODE`:
- Demo mode: `loginAs(role)` just points the app at a seeded user for that role, kept in
  `localStorage` under `horizon-demo-role`. No real auth.
- Supabase mode: the `VITE_OWNER_EMAIL` account is auto-provisioned as admin
  (`provisionOwner` in `bootstrap.ts`) on first sign-in. Everyone else self-registers via
  `RegisterFlow` and sits in `pending` status (a `RegistrationRequest` row) until an
  admin approves/rejects them from `/requests` — approval and request status are derived
  live from the synced store, so access unlocks the moment it happens, no refresh
  needed. Non-owner accounts get an auto-generated username/login email
  (`src/lib/username.ts`), not their real address.

Route-level flow in `App.tsx`: signed in but not yet an approved profile → `PendingGate`;
not signed in → `/login` or `/auth`; approved → the routed app inside `AppLayout`.

## i18n

Arabic is the default and primary language (RTL-first design per the spec this app was
built from), with French and English also available. `src/lib/i18n.ts` sets
`document.documentElement`'s `dir`/`lang` attributes automatically on language change,
and persists the choice to `localStorage`. Locale files: `src/locales/{ar,en,fr}.json` —
when adding user-facing strings, add the key to all three.

## Feature module layout

`src/features/<name>/` — one folder per feature (auth, students, teachers, schedule,
attendance, payments, payroll, notifications, courses, registration, analytics,
activity, dashboard). `src/app/` holds the shell (`AppLayout`, `ProtectedRoute`,
`navigation.ts`). `src/lib/` holds non-UI core logic (types, business rules, config,
formatting/labels, i18n). `src/data/` is the persistence/sync layer described above.
`src-tauri/` is the Rust/Tauri desktop+mobile shell config; it doesn't need touching for
typical web feature work. `supabase/` holds `schema.sql`, RLS/automation SQL, and the
Google Sheets Apps Script webhook source — update these alongside any change to
`COLLECTIONS`/table shape in `src/lib/types.ts`.
