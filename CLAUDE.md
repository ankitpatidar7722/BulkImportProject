# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack web application for bulk importing Excel data into MS SQL Server with validation, duplicate checking, and master data management. Multi-tenant architecture with dynamic database connections and JWT-based authentication.

**Tech Stack:**
- Backend: ASP.NET Core 8 Web API, Dapper, EPPlus, SQL Server
- Frontend: React 18 + TypeScript, Vite, Tailwind CSS, React Router, AG Grid, DevExtreme

## Development Commands

### Backend (.NET 8)

```bash
cd Backend
dotnet restore                    # Restore packages
dotnet build                      # Build project
dotnet run                        # Run API (http://localhost:5050)
dotnet watch run                  # Run with hot reload
dotnet publish -c Release         # Publish for production
# Swagger: http://localhost:5050/swagger
```

### Frontend (React + Vite)

```bash
cd Frontend
npm install                       # Install dependencies
npm run dev                       # Start dev server (http://localhost:3000)
npm run lint                      # Run ESLint
npm run build                     # TypeScript check + Vite build (outputs to dist/)
npm run preview                   # Preview production build
```

### Deployment

```powershell
cd Backend  && .\publish-iis.ps1       # Backend to IIS
cd Frontend && .\deploy-vercel.ps1     # Frontend to Vercel
```

**Production URLs:** Backend (IIS): `https://exceljet.indusanalytics.co.in` | Frontend (Vercel): `https://bulkimport.vercel.app`

### Testing

There is no automated test suite. Testing is manual via Swagger UI and frontend. `TestController.cs` and `DiagController.cs` exist for backend diagnostics.

## Critical Architecture Concepts

### 1. Multi-Tenant Database Connection System

**The application uses dynamic connection strings based on JWT session tokens, NOT a static connection string.**

- **CompanySessionStore** (singleton): In-memory map of `sessionId` → connection string
- **Program.cs**: Registers scoped `SqlConnection` that resolves connection string from the JWT `sessionId` claim
- **Flow**: User logs into company → JWT issued with `sessionId` claim → CompanySessionStore maps `sessionId` → connection string → all subsequent requests use that connection
- **Fallback**: Uses `IndusConnection` from appsettings.json if no session exists (development only)

**When working with database code:** Never hardcode connection strings. Inject `SqlConnection` via DI — it's already configured with the correct tenant connection.

### 2. Two-Step Authentication Flow

**Login sequence:** Company Selection → User Login

- **Step 0**: `CompanyLogin.tsx` — User selects company, backend returns connection string
- **Step 1**: `Login.tsx` — User enters credentials, JWT issued with `sessionId`
- **AuthContext.tsx**: Manages `loginStep` (0→1→2), `loginType` (indus/company), JWT token storage
- **PrivateRoute.tsx**: Guards all authenticated routes
- Two login types: "indus" (admin) and "company" (regular user)
- **Route guards by loginType**: `indus` users default to `/company-subscription` and are blocked from `/dashboard`; `company` users default to `/dashboard` and are blocked from `/company-subscription`. Both redirects are enforced in `App.tsx` route definitions.

### 3. Auto-Migration System

**Program.cs startup code performs automatic, idempotent database schema migrations:**

- Creates/updates tables: CompanyMaster, ModuleMaster, ItemMasterDetails, CountryStateMaster
- Adds columns to: SparePartMaster, LedgerMaster, ItemMaster
- Seeds default data (company record, Indian states)
- All migrations use `IF NOT EXISTS` / `IF COL_LENGTH(...) IS NULL` checks

**When adding new master tables or columns, follow the same idempotent pattern in Program.cs.**

### 4. Service Architecture Pattern

**Controllers → Service Interfaces → Service Implementations (Dapper)**

All services inject `SqlConnection` (already configured with correct tenant connection), use Dapper for all database operations, and return DTOs. There are 21 controllers and 18 service pairs.

Example: `ExcelController.cs` → `IExcelService.cs` → `ExcelService.cs`

`PasswordEncoder.cs` is a standalone utility (no interface) for password hashing — not part of the DI service pattern.

**Exception:** `TransactionDeleteController` intentionally bypasses the service pattern. It directly injects `ICompanySessionStore` and `IHttpContextAccessor` to build its own `SqlConnection`, rather than receiving one from DI. This is intentional — do not refactor it to use the standard pattern without understanding why.

### 5. Frontend Pages vs Components

- `Frontend/src/pages/` — full-page views routed in `App.tsx`: `Dashboard`, `ImportMaster`, `CompanyMaster`, `CompanyLogin`, `CompanySubscription`, `CreateModule`, `DynamicModule`, `ERPTransactionDelete`, `ModuleAuthority`, `ModuleGroupAuthority`, `StockUpload`
- `Frontend/src/components/` — reusable UI: `*Enhanced.tsx` master grids, `*StockUpload.tsx` stock import forms, `ActivityLogViewer`, `SearchableSelect`, `PrivateRoute`, `Login`, `Header`, `Sidebar`

### 6. Frontend API Layer — Monolithic api.ts

**`Frontend/src/services/api.ts` (~2,200 lines)** is the single API service file containing:
- Axios instance with interceptors (JWT injection, global loader toggling, 401 redirect)
- All TypeScript interfaces mirroring backend DTOs
- All API call functions grouped by domain (module, excel, ledger, item, HSN, spare part, tool, stock, auth, company subscription, backup/restore, activity log, message format, transaction delete)

When adding new API endpoints, add the function and any new interfaces to this file.

### 7. Frontend Context Providers

Three React contexts wrap the app:
- **AuthContext** (`context/AuthContext.tsx`): Two-step login state, JWT token, user info, loginType
- **ThemeContext** (`context/ThemeContext.tsx`): Dark/light mode toggle (Tailwind `class` strategy)
- **LoaderContext** (`context/LoaderContext.tsx`): Global loading overlay state, integrated with Axios interceptors

### 8. Excel Import System

**EPPlus-based Excel processing with preview and validation:**

- `ExcelService.cs`: Reads Excel, validates structure, checks duplicates (compares ALL column values)
- Endpoints: `/api/excel/Preview` and `/api/excel/Import`
- Frontend: `ImportMaster.tsx` (generic import), `*Enhanced.tsx` components (master-specific with AG Grid)
- Max file size: 500MB (configured in Program.cs)
- **EPPlus NonCommercial license** set in Program.cs

### 9. Master Data Components

Each master entity follows the same pattern:
- Backend: DTO + Service interface + Service implementation + Controller
- Frontend: `*Enhanced.tsx` component using AG Grid with inline editing, validation, Excel export

**Masters:** LedgerMaster, ItemMaster, SparePartMaster, ToolMaster, HSNMaster, ModuleMaster

**Stock uploads:** `ItemStockUpload.tsx`, `SparePartMasterStockUpload.tsx`, `ToolStockUpload.tsx` — bulk Excel upload with warehouse/bin validation.

### 10. Activity Logging

All data modifications (Insert, Update, Delete, Clear) are logged via `ActivityLogService.cs`. Frontend viewer: `ActivityLogViewer.tsx`.

### 11. Database Backup/Restore System

Supports two workflows for company database provisioning:
1. **Download backup** — `GET /api/DatabaseBackupRestore/download-backup` streams a compressed .bak as .zip
2. **Backup & transfer** — `POST /api/DatabaseBackupRestore/backup-and-transfer` runs async with progress polling via `/status/{operationId}`

Key files: `DatabaseBackupRestoreService.cs`, `DatabaseBackupRestoreController.cs`, `DatabaseBackupRestoreDto.cs`. Server-to-server endpoints use API key auth via `ValidateBackupApiKeyAttribute.cs`.

## DbFix Utility

`Backend/DbFix/` is a standalone .NET console project for one-off database fixes that don't fit into the auto-migration system. Run it directly:

```bash
cd Backend/DbFix
dotnet run
```

It has a hardcoded connection string — update it before running. **Do not use this for routine schema changes; add those to Program.cs migrations instead.**

## Important Configuration

### Backend (appsettings.json)

- `Kestrel.Endpoints.Http.Url`: API listen URL (default `http://localhost:5050`)
- `ConnectionStrings.IndusConnection`: Admin/fallback database connection
- `Jwt`: Key (32+ chars), Issuer, Audience, ExpirationHours
- `BackupRestore`: BackupStoragePath, RestoreStoragePath, ApiKey, ChunkSizeBytes

### Frontend (.env / .env.production)

- `VITE_API_BASE_URL`: Backend API URL (`http://localhost:5050/api` for dev)

### CORS (Program.cs)

Allowed origins: `https://bulkimport.vercel.app`, `http://localhost:3000`, `http://localhost:5173`

## Common Development Patterns

### Adding a New Master Table

1. Create DTO in `Backend/DTOs/`
2. Create Service interface `Backend/Services/I{Name}Service.cs`
3. Create Service implementation `Backend/Services/{Name}Service.cs` using Dapper
4. Create Controller `Backend/Controllers/{Name}Controller.cs`
5. Register service in Program.cs: `builder.Services.AddScoped<I{Name}Service, {Name}Service>()`
6. Add idempotent auto-migration in Program.cs startup block
7. Add API functions and interfaces to `Frontend/src/services/api.ts`
8. Create React component `Frontend/src/components/{Name}Enhanced.tsx` using AG Grid
9. Add route in `Frontend/src/App.tsx`

### Adding a New Column to Existing Master

1. Add idempotent migration in Program.cs startup (follow `IF COL_LENGTH(...) IS NULL` pattern)
2. Update DTO in `Backend/DTOs/`
3. Update service SQL queries in `Backend/Services/`
4. Update TypeScript interface and API functions in `Frontend/src/services/api.ts`
5. Update AG Grid column definitions in the corresponding `*Enhanced.tsx` component

## Key File Locations

- **Backend entry**: `Backend/Program.cs` — DI registration, migrations, middleware pipeline
- **Frontend entry**: `Frontend/src/App.tsx` — routing, layout, context providers
- **Auth**: `Backend/Services/AuthService.cs`, `Frontend/src/context/AuthContext.tsx`
- **Excel processing**: `Backend/Services/ExcelService.cs`
- **All API calls**: `Frontend/src/services/api.ts`
- **Master components**: `Frontend/src/components/*Enhanced.tsx`
- **SQL scripts**: `Database/` directory (setup.sql, ActivityLog_Table.sql)

## Troubleshooting

- **"No connection string" errors**: Check JWT token has `sessionId` claim; verify CompanySessionStore has active session; confirm user completed company login step
- **Excel import failures**: Verify EPPlus license context in Program.cs; check max request body size; ensure table name matches ModuleMaster.ModuleName
- **CORS issues**: Verify origin is in allowed list in Program.cs; check frontend VITE_API_BASE_URL matches backend URL
- **Backup path mismatch**: When backing up from remote SQL Server, the .bak is created on the remote machine — use UNC paths or ensure API and SQL Server share a filesystem
