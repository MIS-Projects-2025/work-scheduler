# Work Scheduler — Architecture & Turnover Documentation

> **Last Updated:** 2026-05-18  
> **Stack:** Laravel 12 · React 18 · Inertia.js · MySQL

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Environment Setup](#2-environment-setup)
3. [Architecture Overview](#3-architecture-overview)
4. [Database Architecture](#4-database-architecture)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Role-Based Access](#6-role-based-access)
7. [Process Flows by Feature](#7-process-flows-by-feature)
   - [7.1 Login / SSO](#71-login--sso)
   - [7.2 Dashboard](#72-dashboard)
   - [7.3 Create Work Schedule (Template Upload)](#73-create-work-schedule-template-upload)
   - [7.4 Approve a Schedule](#74-approve-a-schedule)
   - [7.5 Disapprove a Schedule](#75-disapprove-a-schedule)
   - [7.6 Acknowledge a Schedule](#76-acknowledge-a-schedule)
   - [7.7 Edit Schedule Days](#77-edit-schedule-days)
   - [7.8 View Remarks History](#78-view-remarks-history)
   - [7.9 Export Reports](#79-export-reports)
   - [7.10 Admin — Holidays](#710-admin--holidays)
   - [7.11 Admin — Payroll Cutoff Schedules](#711-admin--payroll-cutoff-schedules)
   - [7.12 Admin — Shift Codes](#712-admin--shift-codes)
   - [7.13 Admin — System Admins](#713-admin--system-admins)
   - [7.14 Maintenance Mode](#714-maintenance-mode)
8. [Routing Reference](#8-routing-reference)
9. [Backend Layer Reference](#9-backend-layer-reference)
10. [Frontend Structure](#10-frontend-structure)
11. [External Integrations](#11-external-integrations)
12. [Audit Trail](#12-audit-trail)
13. [Key Business Rules](#13-key-business-rules)
14. [Troubleshooting Guide](#14-troubleshooting-guide)
15. [Developer Runbook](#15-developer-runbook)

---

## 1. System Overview

The **Work Scheduler** is a full-stack internal web application for managing employee work schedules across payroll cutoff periods. It integrates with an external HRIS (Human Resource Information System) for employee data and an SSO service (Authify) for authentication.

### What It Does

| Capability | Who Uses It |
|---|---|
| Upload and submit employee schedules via Excel template | Managers |
| Approve or disapprove submitted schedules | Approvers / Managers |
| Acknowledge assigned schedules | Employees |
| View and export all schedules and OT data | HR Admins |
| Maintain shift codes, holidays, payroll cutoff periods | HR Admins |
| Dashboard analytics (status breakdown, trends, shift usage) | All roles |

### High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    BROWSER (React 18)                        │
│   Dashboard · Schedule List · View · Template · Admin Pages  │
└──────────────────────┬───────────────────────────────────────┘
                       │  Inertia.js (no separate API for pages)
┌──────────────────────▼───────────────────────────────────────┐
│                MIDDLEWARE CHAIN (Laravel)                     │
│  AuthMiddleware → AdminMiddleware → HandleInertiaRequests    │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│              ROUTES  (routes/*.php)                          │
│  auth · general · worksched · admin · api                    │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│            CONTROLLERS (app/Http/Controllers/)               │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│              SERVICES (app/Services/)                        │
│  Business logic, HRIS API calls, Excel generation            │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│           REPOSITORIES (app/Repositories/)                   │
│  Query builders, scoped access, complex aggregations         │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                 MODELS (app/Models/)                         │
│  Eloquent ORM, status constants, relationships               │
└──────────────────────┬───────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌─────────┐  ┌────────────┐  ┌──────────┐
   │  Main   │  │ Masterlist │  │ Authify  │
   │   DB    │  │    DB      │  │   DB     │
   └─────────┘  └────────────┘  └──────────┘
        │
        ▼
   ┌─────────┐
   │  HRIS   │
   │   API   │
   └─────────┘
```

---

## 2. Environment Setup

### Required `.env` Variables

```env
# App identity & prefix
APP_NAME=TEMPLATE              # Prepended to all routes (e.g., /TEMPLATE/work-schedule)
APP_DISPLAY_NAME='Work Scheduler'
APP_URL=http://localhost
APP_TIMEZONE=Asia/Manila

# SSO
SSO_COOKIE_NAME=sso_token     # Cookie name that holds the SSO token

# HRIS API
HRIS_API_URL=http://hris-service/
HRIS_API_KEY=secret

# Primary database (work_schedule, shift_codes, etc.)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=work_scheduler_db
DB_USERNAME=root
DB_PASSWORD=

# Masterlist database (read-only employee data)
MDB_HOST=127.0.0.1
MDB_PORT=3306
MDB_DATABASE=masterlist
MDB_USERNAME=root
MDB_PASSWORD=

# Authify database (SSO sessions)
ADB_HOST=127.0.0.1
ADB_PORT=3306
ADB_DATABASE=authify
ADB_USERNAME=root
ADB_PASSWORD=

SESSION_DRIVER=file
SESSION_LIFETIME=720           # 12 hours
```

### Development Server

```bash
composer run dev    # Starts Laravel, Vite, queue listener, and Pail log viewer concurrently
```

### Individual Commands

```bash
php artisan serve --port=8004   # Laravel only
npm run dev                     # Vite only
php artisan queue:listen --tries=1
php artisan migrate --seed
composer run test               # PHPUnit via php artisan test
```

---

## 3. Architecture Overview

### Backend Pattern

The backend follows a strict **Controller → Service → Repository → Model** layering:

| Layer | Folder | Responsibility |
|---|---|---|
| Controller | `app/Http/Controllers/` | Thin — validates request, delegates, returns Inertia/JSON |
| Service | `app/Services/` | All business logic, HRIS calls, Excel generation |
| Repository | `app/Repositories/` | Data access, complex queries, access-scope enforcement |
| Model | `app/Models/` | Eloquent ORM, status constants, relationships |
| Export | `app/Exports/` | Maatwebsite Excel classes (template + reports) |
| Middleware | `app/Http/Middleware/` | Auth, admin guard, internal API key |

### Frontend Pattern

- **Inertia.js** bridges Laravel and React — no separate REST API for page rendering. Controllers return `Inertia::render('PageName', $props)`.
- **Pages** live in `resources/js/Pages/`. One file per route.
- **State** is managed locally with `useState`/`useReducer`, custom hooks, and Inertia's `useForm`.
- **Navigation** uses `router.visit()` and Inertia `<Link>` — no full page reload.
- **Ziggy** provides named Laravel routes in JavaScript via `route('name')`.

---

## 4. Database Architecture

### Three Database Connections

| Connection Key | Database | Access | Purpose |
|---|---|---|---|
| `mysql` (default) | `work_scheduler_db` | Read/Write | All app data |
| `masterlist` | masterlist DB | Read-only | Employee master records |
| `authify` | authify DB | Read-only | SSO session tokens |

### Primary Tables (`work_scheduler_db`)

#### `work_schedule`
Core record per employee per payroll period.

| Column | Type | Notes |
|---|---|---|
| `id` | PK | Auto-increment |
| `emp_id` | string | Employee number |
| `payroll_date_start` | date | Cutoff period start |
| `payroll_date_end` | date | Cutoff period end |
| `work_sched_status` | int | 1=Pending, 2=Approved, 3=Acknowledged, 4=Disapproved |
| `shift` | string | General shift type |
| `supervisor_id` | string | Level-1 approver |
| `approver2_id` | string | Level-2 approver |
| `remarks` | text | Latest remarks |
| `created_by` | string | Manager who submitted |
| `date_created` | timestamp | |
| `date_updated` | timestamp | |

#### `work_schedule_days`
One row per calendar day per schedule.

| Column | Type | Notes |
|---|---|---|
| `id` | PK | |
| `work_schedule_id` | FK → work_schedule.id | |
| `work_date` | date | |
| `schedule_code` | string | Shift code value |

#### `shift_codes`
Defines available shift types.

| Column | Type | Notes |
|---|---|---|
| `shift_code_id` | PK | |
| `shiftcode` | string | Unique code (e.g., "REG8") |
| `shiftcode_value` | string | Display value |
| `shiftcode_desc` | string | Description |
| `shift_group` | enum | AMS / PL2/DEFAULT / DEFAULT |
| `shift_code_status` | int | 1=Active, 2=Inactive |
| `shiftcode_bg_color` | string | Hex color (grid background) |
| `shiftcode_font_color` | string | Hex color (grid text) |
| `time_windows` | JSON | 8-slot array of HH:MM times |
| `ot_hrs` | numeric | OT threshold in hours |
| `created_by` / `updated_by` | string | |

#### `payroll_cutoff_schedule`
Defines payroll periods.

| Column | Type | Notes |
|---|---|---|
| `ID` | PK | Non-standard uppercase |
| `payroll_date_start` | date | |
| `payroll_date_end` | date | |
| `created_by` | string | |

#### `holidays`

| Column | Type | Notes |
|---|---|---|
| `ID` | PK | |
| `holiday_name` | string | |
| `holiday_date` | date | |
| `holiday_type` | enum | Regular / Special |
| `color` | string | Hex, default #FF5733 |

#### `remarks_history`
Append-only audit log for schedule status changes.

| Column | Type | Notes |
|---|---|---|
| `history_id` | PK | |
| `work_sched_id` | FK → work_schedule.id | |
| `emp_id` | string | |
| `empname` | string | Snapshot of name at time of action |
| `old_remarks` | text | |
| `new_remarks` | text | |
| `operation` | string | approve / disapprove |
| `updated_at` | timestamp | |
| `updated_by` | string | Emp ID of actor |

#### `admin`
System admin registry.

| Column | Type | Notes |
|---|---|---|
| `emp_id` | string PK | |
| `emp_name` | string | |
| `emp_role` | enum | hr_admin / (other) |
| `last_updated_by` | string | |

#### `system_status`
Single-row maintenance mode flag.

| Column | Type | Notes |
|---|---|---|
| `id` | PK | |
| `status` | enum | online / maintenance |
| `message` | string | Displayed to users during maintenance |

### External Tables (Read-only)

#### `masterlist.employee_masterlist`

| Column | Notes |
|---|---|
| `EMPLOYID` | Employee number |
| `EMPNAME` | Full name |
| `JOB_TITLE`, `DEPARTMENT`, `PRODLINE`, `STATION` | Work details |
| `ACCSTATUS` | 1 = active |

#### `authify.authify_sessions`

| Column | Notes |
|---|---|
| `token` | SSO token value |
| `emp_id`, `emp_name`, `emp_firstname` | Identity |
| `emp_dept_id`, `emp_jobtitle_id`, `emp_prodline_id` | Org data |
| `emp_position_id`, `emp_station_id` | Position |
| `shift_type`, `team` | |
| `emp_from` | If not null, access is restricted to that system |
| `generated_at` | Token creation time |

---

## 5. Authentication & Authorization

### SSO Token Resolution (AuthMiddleware)

On every request, `AuthMiddleware` resolves the user identity in this priority order:

```
1. Query string: ?key={token}
2. Cookie: sso_token  (configurable via SSO_COOKIE_NAME)
3. Laravel session: emp_data.token
```

Once resolved, the token is validated against `authify.authify_sessions`. If valid, the session is populated with:

```php
session('emp_data') = [
    'token', 'emp_id', 'emp_name', 'emp_firstname',
    'emp_dept_id', 'emp_jobtitle_id', 'emp_prodline_id',
    'emp_position_id', 'emp_station_id', 'shift_type',
    'team', 'emp_system_role', 'generated_at', 'has_direct_reports'
]
```

### Access Restriction (`emp_from`)

If `authify_sessions.emp_from` is not null, the user is only authorized for that specific system. They are redirected to `/unauthorized`.

### Maintenance Mode

`AuthMiddleware` checks `system_status.status`. If `maintenance`:
- All requests return a 503 Maintenance page.
- Exceptions: logout and system-status routes.
- HR admins can bypass (emp_system_role = 'hr_admin').

### Internal API Authentication (`ApiAuthMiddleware`)

For `/api/*` endpoints. Requires header:
```
X-Internal-Key: {config('services.internal.key')}
```
Returns 401 JSON if missing or invalid.

---

## 6. Role-Based Access

### Role Determination

| Role | How It's Set | Key Field |
|---|---|---|
| **HR Admin** | `emp_id == 0` in authify session, or exists in `admin` table with `emp_role = hr_admin` | `emp_system_role = 'hr_admin'` |
| **Manager** | Has records in `work_schedule.created_by` or `work_schedule.approver2_id` | Detected at runtime |
| **Employee** | Default — no special conditions | No special flags |

### Access Scope per Role

```
Employee (default)
└── Can see: schedules where emp_id = own ID

Manager
├── Can see: schedules where emp_id = own ID
├── Can see: schedules where created_by = own ID
└── Can see: schedules where approver2_id = own ID

HR Admin
└── Can see: ALL schedules, ALL employees, ALL cutoffs
```

### Feature Access Matrix

| Feature | Employee | Manager | HR Admin |
|---|---|---|---|
| View own schedule | ✓ | ✓ | ✓ |
| Upload schedule template | — | ✓ | ✓ |
| Approve/Disapprove schedules | — | ✓ | ✓ |
| Acknowledge schedule | ✓ | ✓ | ✓ |
| Edit individual day shifts | — | ✓ | ✓ |
| View all employee schedules | — | — | ✓ |
| Export schedule Excel | — | — | ✓ |
| Export OT report | — | — | ✓ |
| Export remarks history | — | — | ✓ |
| Manage holidays | — | — | ✓ |
| Manage payroll cutoffs | — | — | ✓ |
| Manage shift codes | — | — | ✓ |
| Manage system admins | — | — | ✓ |
| Toggle maintenance mode | — | — | ✓ |

### Admin Panel Access

Protected by `AdminMiddleware`: user must exist in the `admin` table.

Routes protected:
- `/admin` — admin list
- `/new-admin` — add admin
- `/add-admin`, `/remove-admin`, `/change-admin-role`

---

## 7. Process Flows by Feature

---

### 7.1 Login / SSO

```
User navigates to app URL
        │
        ▼
AuthMiddleware: no token found in query/cookie/session
        │
        ▼
Redirect to Authify SSO service login page
        │
        ▼
User authenticates at Authify
        │
        ▼
Authify redirects back: /{APP_NAME}/?key={token}
        │
        ▼
AuthMiddleware: reads token from query param
        │
        ▼
Query authify.authify_sessions WHERE token = ?
        │
     found?
    /       \
  No         Yes
  │           │
  ▼           ▼
Redirect   Check emp_from
to SSO         │
           null?
          /     \
        Yes      No
         │        │
         ▼        ▼
    Set session  Redirect
    emp_data     to /unauthorized
         │
         ▼
    Store token in session
         │
         ▼
    Redirect to originally requested page
```

**Logout Flow:**
```
User clicks Logout
    │
    ▼
GET /{APP_NAME}/logout
    │
    ▼
AuthenticationController::logout()
    │
    ▼
Clear session
    │
    ▼
Redirect to Authify logout endpoint
```

---

### 7.2 Dashboard

```
User navigates to /{APP_NAME}/
        │
        ▼
DashboardController::index()
        │
        ▼
Determine role flags:
  isHrAdmin = (emp_system_role === 'hr_admin')
  isManager = (has created_by or approver2_id records)
        │
        ▼
DashboardService::getDashboardData(empId, isHrAdmin, isManager)
        │
        ├── DashboardRepository::countByStatus()         → pending/approved/acknowledged/disapproved
        ├── DashboardRepository::countDistinctEmployees()
        ├── DashboardRepository::countByMonth(6)         → 6-month trend
        ├── DashboardRepository::countByShiftGroup()     → AMS / PL2 / DEFAULT distribution
        ├── DashboardRepository::topShiftCodes(8)        → most-used shift codes
        ├── DashboardRepository::upcomingCutoffs(5)      → next payroll periods
        └── DashboardRepository::recentSchedules(10)    → latest records
        │
        ▼
Inertia::render('Dashboard', $data)
        │
        ▼
Dashboard.jsx renders:
  - Stat cards (pending, approved, etc.)
  - Bar chart: 6-month monthly trend (Chart.js)
  - Doughnut chart: status breakdown
  - Bar chart: shift group distribution
  - Cards: top 8 shift codes with colors
  - Table: upcoming 5 cutoffs
  - Table: 10 most recent schedules

NOTE: Scope of data depends on role:
  Employee → only their own records
  Manager  → own + created + approver records
  HR Admin → all records
```

---

### 7.3 Create Work Schedule (Template Upload)

```
STEP 1 — Load Template Page
        │
Manager visits /work-schedule/template
        │
        ▼
WorkScheduleController::templatePage()
        │
        ▼
WorkScheduleService::getTemplatePageData(empId)
  ├── PayrollCutoffSchedule::all() ordered by date    → cutoffList
  ├── ShiftCode::active(), filtered by prod line      → shifts
  └── HrisApiService::fetchDirectReports(empId)       → employees (direct reports)
        │
        ▼
Inertia::render('WorkSchedule/Template', $props)
        │
        ▼
Template.jsx:
  - Manager selects payroll cutoff period
  - Manager selects employees from direct reports list


STEP 2 — Download Excel Template
        │
Manager clicks "Download Template"
        │
        ▼
GET /work-schedule/template/download?cutoff_id=123
        │
        ▼
WorkScheduleController::downloadTemplate()
        │
        ▼
WorkScheduleService::getDownloadContext(empId, cutoffId)
  ├── Fetch cutoff record from DB
  ├── Fetch direct reports from HRIS
  ├── Determine prod line → filter shift codes
  └── Fetch holidays for cutoff period
        │
        ▼
WorkScheduleTemplateExport::generate($context)
  - Sheet 1: Blank schedule grid (employees × days)
  - Includes shift code legend (code, color, description)
  - Highlights holidays in grid
        │
        ▼
Return Excel file download (Maatwebsite\Excel)


STEP 3 — Fill & Upload Template
        │
Manager fills Excel with shift codes per employee per day
Manager uploads Excel via Template.jsx form
        │
        ▼
POST /work-schedule/template/submit
Payload: {
  employees: [
    {
      empId: "12345",
      schedule: { "2025-01-01": "REG8", "2025-01-02": "RD", ... },
      supervisorId: "00001",
      approver2Id: "00002",
      cutoff_id: 123
    },
    ...
  ]
}
        │
        ▼
WorkScheduleController::submitTemplate()
        │
        ▼
WorkScheduleService::submitSchedules($data, $createdBy)
  For each employee:
    ├── Check if schedule already exists for same emp+cutoff
    │     ├── If exists & pending → overwrite (delete + recreate)
    │     ├── If exists & approved/acknowledged → blocked
    │     └── If not exists → create new
    ├── INSERT work_schedule (status=1 pending)
    └── INSERT work_schedule_days (one row per day)
        │
        ▼
Return JSON: { status, saved: N, errors: [], overwritten: [], blocked: [] }
        │
        ▼
Frontend shows ResultModal with counts
        │
        ▼
Redirect to /work-schedule (Index page)
```

---

### 7.4 Approve a Schedule

```
STEP 1 — View Schedule Group
        │
Manager/Approver visits /work-schedule
        │
        ▼
WorkScheduleController::index()
  → Returns list grouped by (created_by, date_start, date_end, status)
        │
        ▼
User clicks "View" on a pending group
        │
        ▼
GET /work-schedule/view?hash={base64 encoded filters}
        │
        ▼
WorkScheduleController::viewSchedules()
WorkScheduleService::getViewData() OR getHrViewData() (if HR admin)
  ├── Fetch all employees in the group
  ├── Fetch their schedule days
  ├── Fetch shift codes (with colors)
  ├── Fetch holidays for the period
  └── Build dual-header table: [dates row] + [day-of-week row]
        │
        ▼
Inertia::render('WorkSchedule/View', $props)
        │
        ▼
View.jsx renders editable schedule grid


STEP 2 — Approve
        │
Approver clicks "Approve" button
        │
        ▼
RemarksDialog.jsx opens (remarks optional for approval)
        │
        ▼
POST /work-schedule/approve
Payload: { created_by, date_start, date_end, remarks?, emp_ids? }
        │
        ▼
WorkScheduleController::approve()
        │
        ▼
WorkScheduleService::updateStatus(..., STATUS_APPROVED=2)
  ├── UPDATE work_schedule SET work_sched_status = 2
  └── INSERT remarks_history (operation='approve', new_remarks, updated_by)
        │
        ▼
Redirect back to View page with success flash
```

---

### 7.5 Disapprove a Schedule

```
Same flow as Approve except:

POST /work-schedule/disapprove
Payload: { created_by, date_start, date_end, remarks (REQUIRED), emp_ids? }
        │
        ▼
WorkScheduleController::disapprove()
        │
        ▼
WorkScheduleService::updateStatus(..., STATUS_DISAPPROVED=4)
  ├── UPDATE work_schedule SET work_sched_status = 4
  └── INSERT remarks_history (operation='disapprove', new_remarks, updated_by)
        │
        ▼
Redirect back to View page with success flash

NOTE: Remarks are REQUIRED for disapproval. Validation will reject if empty.
```

---

### 7.6 Acknowledge a Schedule

```
Employee receives approved schedule notification (via other means)
        │
        ▼
Employee views schedule at /work-schedule/view?hash=...
        │
        ▼
Employee clicks "Acknowledge"
        │
        ▼
POST /work-schedule/acknowledge
Payload: { work_schedule_ids: [1, 2, 3] }
        │
        ▼
WorkScheduleController::acknowledge()
        │
        ▼
UPDATE work_schedule SET work_sched_status = 3 (Acknowledged)
WHERE id IN (?) AND emp_id = session.emp_id   ← security: employee can only ack own records
        │
        ▼
Redirect back, status badge updates to "Acknowledged"
```

---

### 7.7 Edit Schedule Days

```
Manager/HR Admin is on View page
        │
        ▼
User clicks a cell in the schedule grid
        │
        ▼
CellEditDialog.jsx opens — shows dropdown of shift codes
        │
        ▼
User selects new shift code, clicks Save
        │
        ▼
POST /work-schedule/save-edits
Payload: {
  date_start, date_end,
  changes: [
    { work_schedule_id: 1, work_date: "2025-01-05", shift_code_id: 12 },
    ...
  ]
}
        │
        ▼
WorkScheduleController::saveEdits()
        │
        ▼
WorkScheduleService::saveScheduleEdits($changes)
  For each change:
    ├── UPDATE work_schedule_days SET schedule_code = ? WHERE work_schedule_id = ? AND work_date = ?
    └── INSERT remarks_history (operation='edit', old_remarks=old shift, new_remarks=new shift)
        │
        ▼
Return JSON: { success: true, updated: N }
        │
        ▼
Grid refreshes with new shift code + color
```

---

### 7.8 View Remarks History

```
HR Admin is on View page (or Schedule Index)
        │
        ▼
HR Admin clicks "Remarks History" button
        │
        ▼
GET /work-schedule/remarks-history?date_start=&date_end=&search=&page=1&per_page=15
        │
        ▼
WorkScheduleController::getRemarksHistory()
  HR Admin check: isHrAdmin === true (else 403)
        │
        ▼
WorkScheduleService::getRemarksHistoryPaginated(dateStart, dateEnd, search, page, perPage)
WorkScheduleRepository::getRemarksHistoryPaginated(...)
  SELECT * FROM remarks_history
  JOIN work_schedule ON work_sched_id = id
  WHERE payroll_date BETWEEN ? AND ?
  AND (empname LIKE ? OR new_remarks LIKE ?)
  ORDER BY updated_at DESC
  PAGINATE
        │
        ▼
Return JSON: { data: [...], meta: { total, page, ... } }
        │
        ▼
RemarksHistoryModal.jsx renders paginated table

EXPORT:
GET /work-schedule/remarks-history/export?date_start=&date_end=
        │
        ▼
WorkScheduleController::exportRemarksHistory()
        │
        ▼
RemarksHistoryExport → Excel file download
```

---

### 7.9 Export Reports

All exports are HR Admin only.

#### Schedule Export (All employees, all shifts)
```
GET /work-schedule/export?date_start=&date_end=
        │
        ▼
WorkScheduleController::exportSchedule()
WorkScheduleService::getScheduleExportData()
WorkScheduleRepository::getScheduleExportData()
        │
        ▼
WorkScheduleDataExport → Excel:
  Columns: EmpID | Name | Department | ProdLine | Status | Day1 | Day2 | ... | DayN
  Dual header row: dates + day-of-week abbreviations
```

#### OT Export
```
GET /work-schedule/export-ot?date_start=&date_end=
        │
        ▼
WorkScheduleController::exportOt()
WorkScheduleService::getOtExportData()
        │
        ▼
WorkScheduleOtExport → Excel:
  Columns: EmpID | Name | Department | OT Hours
  Based on shift_codes.ot_hrs threshold
```

---

### 7.10 Admin — Holidays

```
HR Admin opens /admin/holidays
        │
        ▼
HolidayController::page() → Inertia render Admin/Holiday.jsx
        │
Ajax calls via fetch/Inertia form:

LIST:   GET    /holidays?year=2025&search=&per_page=15
SHOW:   GET    /holidays/{id}
CREATE: POST   /holidays  { holiday_name, holiday_date, holiday_type, color }
UPDATE: PUT    /holidays/{id}
DELETE: DELETE /holidays/{id}
        │
        ▼
HolidayService (validation):
  - holiday_date format must be Y-m-d
  - holiday_type must be Regular or Special
  - No duplicate date allowed (HolidayRepository::existsOnDate)
  - color must be valid hex (optional, defaults to #FF5733)
```

---

### 7.11 Admin — Payroll Cutoff Schedules

```
HR Admin opens /admin/payroll-cutoff-schedules
        │
        ▼
PayrollCutoffScheduleController::page() → Admin/PayrollCutoffSchedule.jsx
        │
Ajax calls:

LIST:   GET    /payroll-cutoff-schedules?year=&search=&per_page=
SHOW:   GET    /payroll-cutoff-schedules/{id}
CREATE: POST   /payroll-cutoff-schedules  { payroll_date_start, payroll_date_end }
UPDATE: PUT    /payroll-cutoff-schedules/{id}
DELETE: DELETE /payroll-cutoff-schedules/{id}
        │
        ▼
PayrollCutoffScheduleService (validation):
  - end_date must be after start_date
  - No duplicate start_date (existsWithSameStart)
  - No date range overlap with existing records (hasOverlap)
```

---

### 7.12 Admin — Shift Codes

```
HR Admin opens /admin/shift-codes
        │
        ▼
ShiftCodeController::page() → Admin/ShiftCode.jsx
        │
Ajax calls:

LIST:   GET    /shift-codes?search=&per_page=
SHOW:   GET    /shift-codes/{id}
CREATE: POST   /shift-codes  { shiftcode, shiftcode_desc, shift_group, colors, status, ot_hrs, time_windows }
UPDATE: PUT    /shift-codes/{id}
DELETE: DELETE /shift-codes/{id}
        │
        ▼
ShiftCodeService (validation):
  - shiftcode is unique (case-insensitive, normalized to UPPERCASE)
  - shift_code_status: stored as 1 (Active) / 2 (Inactive), returned as string
  - time_windows: array of exactly 8 slots (HH:MM or null)
  - Soft validation: ot_hrs is numeric if provided
```

---

### 7.13 Admin — System Admins

```
HR Admin opens /admin
        │
        ▼
AdminController::index() → Admin/Admin.jsx
  Lists all records from admin table
        │
Add Admin:
HR Admin clicks "Add Admin"
        │
        ▼
GET /new-admin
AdminController::index_addAdmin()
  Lists employees from masterlist.employee_masterlist WHERE ACCSTATUS=1
  (employees not already in admin table)
        │
        ▼
Admin/NewAdmin.jsx → HR Admin selects employee
        │
        ▼
POST /add-admin { id, name, role }
AdminController::addAdmin()
  INSERT INTO admin (emp_id, emp_name, emp_role, last_updated_by)
        │
Remove Admin:
POST /remove-admin { id }
AdminController::removeAdmin()
  DELETE FROM admin WHERE emp_id = ?
        │
Change Role:
PATCH /change-admin-role { id, role }
AdminController::changeAdminRole()
  UPDATE admin SET emp_role = ?
  If current user's own record → update session emp_system_role
```

---

### 7.14 Maintenance Mode

```
HR Admin can toggle via:
  SystemStatusService::setMaintenance($message)
  SystemStatusService::setOnline()
        │
        ▼
Updates system_status.status and system_status.message
        │
        ▼
AuthMiddleware checks on every request:
  if status == 'maintenance' AND user is NOT hr_admin
    → Return 503 Maintenance page with message
```

---

## 8. Routing Reference

All routes are prefixed with `/{APP_NAME}` (configured via `.env APP_NAME`).

### Authentication Routes (`routes/auth.php`)

| Method | Path | Controller | Name |
|---|---|---|---|
| GET | `/logout` | AuthenticationController@logout | `logout` |
| GET | `/unauthorized` | Inertia render | — |

### General Routes (`routes/general.php`) — Requires AuthMiddleware

| Method | Path | Controller | Name |
|---|---|---|---|
| GET | `/` | DashboardController@index | `dashboard` |
| GET | `/profile` | ProfileController@index | `profile.index` |
| POST | `/change-password` | ProfileController@changePassword | `changePassword` |

#### Admin Sub-routes — Requires AdminMiddleware

| Method | Path | Controller | Name |
|---|---|---|---|
| GET | `/admin` | AdminController@index | `admin` |
| GET | `/new-admin` | AdminController@index_addAdmin | `index_addAdmin` |
| POST | `/add-admin` | AdminController@addAdmin | `addAdmin` |
| POST | `/remove-admin` | AdminController@removeAdmin | `removeAdmin` |
| PATCH | `/change-admin-role` | AdminController@changeAdminRole | `changeAdminRole` |

### Work Schedule Routes (`routes/worksched.php`)

| Method | Path | Controller | Name |
|---|---|---|---|
| GET | `/work-schedule` | WorkScheduleController@index | `workschedule.index` |
| GET | `/work-schedule/template` | WorkScheduleController@templatePage | `workschedule.template` |
| GET | `/work-schedule/template/download` | WorkScheduleController@downloadTemplate | `workschedule.template.download` |
| POST | `/work-schedule/template/submit` | WorkScheduleController@submitTemplate | `workschedule.template.submit` |
| GET | `/work-schedule/view` | WorkScheduleController@viewSchedules | `workschedule.view` |
| GET | `/work-schedule/cutoff-days` | WorkScheduleController@getCutoffDays | `workschedule.cutoff-days` |
| POST | `/work-schedule/acknowledge` | WorkScheduleController@acknowledge | `workschedule.acknowledge` |
| POST | `/work-schedule/approve` | WorkScheduleController@approve | `workschedule.approve` |
| POST | `/work-schedule/disapprove` | WorkScheduleController@disapprove | `workschedule.disapprove` |
| POST | `/work-schedule/save-edits` | WorkScheduleController@saveEdits | `workschedule.save-edits` |
| GET | `/work-schedule/remarks-history` | WorkScheduleController@getRemarksHistory | `workschedule.remarks-history` |
| GET | `/work-schedule/remarks-history/export` | WorkScheduleController@exportRemarksHistory | `workschedule.remarks-history.export` |
| GET | `/work-schedule/export` | WorkScheduleController@exportSchedule | `workschedule.export` |
| GET | `/work-schedule/export-ot` | WorkScheduleController@exportOt | `workschedule.export-ot` |

### Admin Setup Routes (`routes/admin.php`)

| Method | Path | Controller |
|---|---|---|
| GET | `/admin/holidays` | HolidayController@page |
| GET/POST | `/holidays` | HolidayController@index / store |
| GET/PUT/DELETE | `/holidays/{id}` | HolidayController@show / update / destroy |
| GET | `/admin/payroll-cutoff-schedules` | PayrollCutoffScheduleController@page |
| GET/POST | `/payroll-cutoff-schedules` | PayrollCutoffScheduleController@index / store |
| GET/PUT/DELETE | `/payroll-cutoff-schedules/{id}` | PayrollCutoffScheduleController@show / update / destroy |
| GET | `/admin/shift-codes` | ShiftCodeController@page |
| GET/POST | `/shift-codes` | ShiftCodeController@index / store |
| GET/PUT/DELETE | `/shift-codes/{id}` | ShiftCodeController@show / update / destroy |

### Internal API Routes (`routes/api.php`) — Requires X-Internal-Key Header

| Method | Path | Controller |
|---|---|---|
| GET | `/api/payroll-cutoff-schedules` | PayrollCutoffScheduleApiController@index |
| GET | `/api/payroll-cutoff-schedules/{id}` | PayrollCutoffScheduleApiController@show |

---

## 9. Backend Layer Reference

### Services

| Service | File | Purpose |
|---|---|---|
| `WorkScheduleService` | `app/Services/WorkScheduleService.php` | Core scheduling — submit, approve, disapprove, edit, export |
| `DashboardService` | `app/Services/DashboardService.php` | Dashboard data aggregation |
| `HolidayService` | `app/Services/HolidayService.php` | Holiday CRUD with validation |
| `PayrollCutoffScheduleService` | `app/Services/PayrollCutoffScheduleService.php` | Cutoff CRUD with overlap validation |
| `ShiftCodeService` | `app/Services/ShiftCodeService.php` | Shift code CRUD, uniqueness enforcement |
| `HrisApiService` | `app/Services/HrisApiService.php` | All calls to external HRIS REST API |
| `SystemStatusService` | `app/Services/SystemStatusService.php` | Maintenance mode toggle |

### HRIS API Calls (HrisApiService)

| Method | HRIS Endpoint | Returns |
|---|---|---|
| `fetchEmployeeName($id)` | GET `/api/employees/{id}` | string name |
| `fetchWorkDetails($id)` | GET `/api/employees/{id}/work` | array: position, prodline, dept, etc. |
| `fetchApprovers($id)` | GET HRIS approvers endpoint | approver1, approver2 info |
| `fetchOperationDirector()` | GET HRIS endpoint | emp_id, name |
| `fetchActiveEmployees($search, $page)` | GET with query params | paginated employee list |
| `fetchDirectReports($empId)` | GET `/api/employees/direct-reports/{id}` | array of employees |
| `fetchEmployeesBulk($empNos[])` | POST `/api/employees/bulk` | map: emp_no → details |
| `fetchEmployeeNamesBulk($empIds[])` | POST `/api/employees/names/bulk` | map: emp_id → name |

### Repositories

| Repository | Key Responsibility |
|---|---|
| `WorkScheduleRepository` | Paginated groups, access-scoped queries, bulk edits, remarks history |
| `DashboardRepository` | Analytics aggregations, scoped by role |
| `HolidayRepository` | CRUD + duplicate date check |
| `PayrollCutoffScheduleRepository` | CRUD + overlap detection |
| `ShiftCodeRepository` | CRUD + unique code check |
| `Api/PayrollCutoffScheduleApiRepository` | API-specific read queries |

### Exports (Maatwebsite Excel)

| Export Class | Route | Output |
|---|---|---|
| `WorkScheduleTemplateExport` | `/template/download` | Multi-sheet blank schedule grid for managers |
| `WorkScheduleDataExport` | `/export` | All employees × all days for a cutoff (HR) |
| `WorkScheduleOtExport` | `/export-ot` | OT hours per employee (HR) |
| `RemarksHistoryExport` | `/remarks-history/export` | Full audit trail for a cutoff (HR) |

---

## 10. Frontend Structure

### Pages (`resources/js/Pages/`)

| Page File | Route | Who Sees It |
|---|---|---|
| `Dashboard.jsx` | `/` | All roles |
| `WorkSchedule/Index.jsx` | `/work-schedule` | All roles (scoped data) |
| `WorkSchedule/View.jsx` | `/work-schedule/view` | All roles (scoped data) |
| `WorkSchedule/Template.jsx` | `/work-schedule/template` | Managers / HR Admin |
| `Admin/Holiday.jsx` | `/admin/holidays` | HR Admin |
| `Admin/PayrollCutoffSchedule.jsx` | `/admin/payroll-cutoff-schedules` | HR Admin |
| `Admin/ShiftCode.jsx` | `/admin/shift-codes` | HR Admin |
| `Admin/Admin.jsx` | `/admin` | HR Admin |
| `Admin/NewAdmin.jsx` | `/new-admin` | HR Admin |
| `Profile.jsx` | `/profile` | All roles |
| `Unauthorized.jsx` | `/unauthorized` | Users with emp_from restriction |

### Key Components

| Component | Purpose |
|---|---|
| `WorkSchedule/components/ScheduleTable.jsx` | Editable grid: employees × days × shift codes |
| `WorkSchedule/components/StatusTabs.jsx` | Tab bar: Pending / Approved / Acknowledged / Disapproved |
| `WorkSchedule/components/BulkActionBar.jsx` | Approve/disapprove multiple schedules |
| `WorkSchedule/components/RemarksDialog.jsx` | Remarks input modal for actions |
| `WorkSchedule/components/CellEditDialog.jsx` | Inline edit single day's shift |
| `WorkSchedule/components/RemarksHistoryModal.jsx` | Paginated audit history |
| `Admin/components/DataToolbar.jsx` | Search, filter, per-page, export toolbar |
| `Admin/components/DeleteConfirmDialog.jsx` | Deletion confirmation dialog |
| `Components/Pagination.jsx` | Page navigation controls |

### Custom Hooks

| Hook | Purpose |
|---|---|
| `useWorkScheduleIndex` | Schedule list state and pagination logic |
| `usePaginatedResource` | Generic pagination handler for CRUD pages |
| `useCrudDialog` | Manage open/close/submit state for CRUD modals |
| `useDebounce` | Delay search input before firing requests |

### UI Libraries

| Library | Usage |
|---|---|
| DaisyUI + Tailwind | Base styling and utility classes |
| ShadCN + Radix UI | Modal dialogs, select inputs, badge, card |
| Silevis ReactGrid | Schedule grid table |
| Chart.js / react-chartjs-2 | Dashboard bar and doughnut charts |
| Sonner | Toast notifications |
| Inertia.js | Page routing (no full reload), `useForm`, `router.visit()` |
| Ziggy | `route('name')` helper in JS |
| xlsx | Client-side Excel parsing for template upload |

---

## 11. External Integrations

### HRIS API

- **Purpose**: Employee records, positions, direct reports, approvers
- **Config**: `HRIS_API_URL`, `HRIS_API_KEY` in `.env`
- **Auth**: `X-Internal-Key` header on all requests
- **Used By**: `HrisApiService`, called from `WorkScheduleService`, `DashboardController`

If HRIS is unavailable:
- Employee name lookups return `null` → shown as "Unknown Employee"
- Direct reports list is empty → template page shows no employees
- Work detail validation (`isValidWorkData`) may fail → schedule submission blocked

### Authify (SSO)

- **Purpose**: Authentication — stores session tokens
- **Config**: `ADB_*` env vars (database connection), `SSO_COOKIE_NAME`
- **Access**: Read-only against `authify.authify_sessions` table
- **Token Flow**: Query string → Cookie → Session

### Masterlist Database

- **Purpose**: Employee master data (name, department, job title, account status)
- **Config**: `MDB_*` env vars
- **Access**: Read-only
- **Used By**: Profile page, Admin → NewAdmin employee selector

---

## 12. Audit Trail

### Remarks History Table

Every status change (approve, disapprove) and day edit writes to `remarks_history`:

```
Operation        | Trigger
─────────────────┼──────────────────────────────────────
approve          | POST /work-schedule/approve
disapprove       | POST /work-schedule/disapprove  (remarks required)
edit             | POST /work-schedule/save-edits
```

Each row captures: `emp_id`, `empname` (snapshot), `old_remarks`, `new_remarks`, `operation`, `updated_at`, `updated_by`.

### Loggable Trait

Models that have the `Loggable` trait automatically generate audit log entries via morphMany relationship (stored in `work_sched_logs` table). Attached to: WorkSchedule, WorkScheduleDay, ShiftCode, Holiday, PayrollCutoffSchedule, RemarksHistory.

---

## 13. Key Business Rules

### Schedule Status Machine

```
         ┌──────────────┐
         │  1. PENDING  │  ← Created by Manager via template upload
         └──────┬───────┘
                │
        ┌───────┴────────┐
        ▼                ▼
┌──────────────┐  ┌───────────────┐
│ 2. APPROVED  │  │ 4.DISAPPROVED │  ← Disapproval requires remarks
└──────┬───────┘  └───────────────┘
       │
       ▼
┌──────────────────┐
│ 3. ACKNOWLEDGED  │  ← Employee acknowledges
└──────────────────┘
```

### Shift Code Filtering by Production Line

| Employee Production Line | Shift Group Shown |
|---|---|
| PL8 | AMS |
| PL2 | PL2/DEFAULT |
| All others | DEFAULT |

### Cutoff Period Constraints

- `payroll_date_end` must be **after** `payroll_date_start`
- No two cutoffs can share the same `payroll_date_start`
- Date ranges must **not overlap** with existing cutoffs

### Holiday Constraints

- One holiday per calendar date (no duplicates)
- Type must be `Regular` or `Special`

### Shift Code Constraints

- Code must be unique (case-insensitive)
- Stored and compared in UPPERCASE
- Must have exactly 8 time window slots (can be null)
- Status: 1 = Active, 2 = Inactive (inactive codes hidden from schedule entry)

### Template Overwrite Rules

On template submission:
- Existing `PENDING` schedule for same employee + cutoff → **overwritten** (deleted and recreated)
- Existing `APPROVED` or `ACKNOWLEDGED` schedule → **blocked** (not overwritten)
- No existing schedule → **created**

---

## 14. Troubleshooting Guide

| Symptom | Likely Cause | Resolution |
|---|---|---|
| User gets 401 / redirect loop on login | Token not in authify_sessions or SSO_COOKIE_NAME mismatch | Verify token in DB; check SSO_COOKIE_NAME in .env |
| "Access Denied" / /unauthorized page | `emp_from` field is not null in authify_sessions | Set emp_from to null or add system to allowed list |
| Schedules missing for a user | Access scope does not include user's emp_id | Verify user is emp_id, created_by, or approver2_id on record |
| Employee list empty on Template page | HRIS direct reports API returned empty or failed | Check HRIS_API_URL and HRIS_API_KEY; check HRIS service logs |
| Shift codes not appearing in template | Shift group does not match employee's prodLine | Verify employee prodLine from HRIS and shift_group in shift_codes |
| Excel download fails | Storage not writable or Maatwebsite\Excel missing | Check `storage/` permissions; run `composer install` |
| Template upload shows "blocked" | Existing approved/acknowledged schedule for that cutoff | Manually disapprove existing record first, then re-upload |
| Maintenance mode stuck | system_status.status = 'maintenance' not cleared | Run `php artisan tinker` → `SystemStatus::first()->update(['status' => 'online'])` |
| Dashboard shows no data | User has no schedules in scope | Check if user is in emp_id/created_by/approver2_id of any work_schedule record |
| Holiday not highlighted on grid | Holiday date outside cutoff range, or type not Regular/Special | Verify holiday_date is within payroll_date_start–payroll_date_end |
| Config changes not reflecting | Laravel config cache stale | Run `php artisan config:clear && php artisan view:clear` |

---

## 15. Developer Runbook

### Adding a New Admin Page (e.g., "Work Types")

1. **Migration** — create new table: `php artisan make:migration create_work_types_table`
2. **Model** — `app/Models/WorkType.php` with status constants
3. **Repository** — `app/Repositories/WorkTypeRepository.php` (CRUD + unique check)
4. **Service** — `app/Services/WorkTypeService.php` (validation logic)
5. **Controller** — `app/Http/Controllers/WorkTypeController.php` (`page`, `index`, `show`, `store`, `update`, `destroy`)
6. **Routes** — add to `routes/admin.php`:
   ```php
   Route::get('/admin/work-types', [WorkTypeController::class, 'page']);
   Route::apiResource('/work-types', WorkTypeController::class);
   ```
7. **Frontend Page** — `resources/js/Pages/Admin/WorkType.jsx`
8. **Nav Link** — add to `resources/js/Layouts/AuthenticatedLayout.jsx`

### Adding a New Export

1. Create `app/Exports/NewExport.php` extending `Maatwebsite\Excel\Concerns\FromCollection`
2. Add service method to gather data
3. Add controller method: `return Excel::download(new NewExport($data), 'report.xlsx');`
4. Add route
5. Add button on frontend page

### Querying Scoped Data (Always Use Repository)

```php
// CORRECT — respects access scope
$repo = new WorkScheduleRepository();
$data = $repo->getPaginatedGroups($empId, $status, $empPosition, ...);

// WRONG — bypasses access control
WorkSchedule::where('work_sched_status', $status)->get();
```

### Adding HRIS Fields

1. Update `HrisApiService::fetchWorkDetails()` or `fetchEmployeesBulk()` to include new field
2. Normalize field name (snake_case) in the return array
3. Pass through service → controller → Inertia props
4. Display in relevant page component

### Running in Production

```bash
npm run build                           # Build frontend assets
php artisan config:cache                # Cache config
php artisan route:cache                 # Cache routes
php artisan view:cache                  # Cache Blade/Inertia views
php artisan migrate --force             # Run migrations
php artisan queue:work --daemon         # Start queue worker (use Supervisor)
```

### Clearing All Caches

```bash
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear
```

---

*End of Documentation*
