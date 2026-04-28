# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Start Development Server
```bash
composer run dev
```
This runs concurrently: Laravel PHP server (port 8004), queue listener, Pail log viewer, and Vite dev server.

### Frontend Only
```bash
npm run dev   # Vite dev server
npm run build # Production build
```

### Backend Only
```bash
php artisan serve --port=8004
php artisan queue:listen --tries=1
```

### Tests
```bash
composer run test   # Runs PHPUnit via `php artisan test`
```

### Database
```bash
php artisan migrate --seed
```

## Architecture Overview

Full-stack Laravel 12 + React 18 application using **Inertia.js** — no separate API; the backend renders React pages server-side via Inertia, passing props directly from controllers. Routes live in `routes/web.php`, `routes/auth.php`, `routes/general.php`, and `routes/worksched.php`.

### Backend Structure

- **Controllers** (`app/Http/Controllers/`) — thin; delegate to Services
- **Services** (`app/Services/`) — business logic lives here
  - `WorkScheduleService.php` — core scheduling operations
  - `HrisApiService.php` — external HRIS API integration (env: `HRIS_API_URL`, `HRIS_API_KEY`)
- **Repositories** (`app/Repositories/`) — data access layer
- **Models** (`app/Models/`) — Eloquent models with status constants defined directly on the model
- **Exports** (`app/Exports/`) — Maatwebsite Excel export classes
- **Traits** (`app/Traits/Loggable.php`) — morphMany audit trail; attach to any model that needs change tracking

### Frontend Structure

- **Pages** (`resources/js/Pages/`) — Inertia page components (one per route)
  - `WorkSchedule/` — main feature; contains sub-components and custom hooks
  - `Admin/` — admin user management
  - `Authentication/` — login/SSO flow
- **Components** (`resources/js/Components/`) — shared UI; `ui/` sub-folder holds ShadCN components
- **Layouts** (`resources/js/Layouts/`) — authenticated shell layout
- **State** — Zustand stores for global state; React Hook Form for forms

### Key Data Models

| Model | Table | Notes |
|---|---|---|
| `WorkSchedule` | `work_schedule` | Status: 1=Pending, 2=Approved, 3=Acknowledged, 4=Disapproved |
| `WorkScheduleDay` | `work_schedule_days` | One row per day; links to ShiftCode |
| `ShiftCode` | `shift_codes` | Defines shifts with `bg_color`/`font_color` for grid display |
| `PayrollCutoffSchedule` | `payroll_cutoff_schedule` | Payroll period boundaries |
| `WorkSchedLogs` | `work_sched_logs` | Audit log via `Loggable` trait |

### Multiple Database Connections

Configured in `config/database.php`:
- **default** (`DB_CONNECTION`) — primary app database (SQLite or MySQL)
- **masterlist** — external masterlist DB (`MASTERLIST_DB_*` env vars)
- **authify** — external SSO/auth DB (`AUTHIFY_DB_*` env vars)

### Authentication

Session-based with SSO cookie integration (`SSO_COOKIE_NAME`). Middleware chain: `AuthMiddleware` → `AdminMiddleware`. Employee authorization is based on `emp_position` level retrieved from HRIS API.

### Frontend Libraries

- **Inertia.js** — page navigation without full reload; use `router.visit()` and `useForm()` from `@inertiajs/react`
- **Zustand** — global state stores
- **React Hook Form** — form state and validation
- **Silevis ReactGrid** — the schedule grid table
- **Chart.js / react-chartjs-2** — dashboard charts
- **xlsx** — client-side Excel parsing for template upload
- **Maatwebsite Excel** — server-side Excel generation (template download)
- **Sonner** — toast notifications (initialized in `app.jsx`)
- **DaisyUI + ShadCN + Radix UI** — UI component layers on top of Tailwind
- **Ziggy** — generates named Laravel routes in JS (`route('name')`)
