# Subscription Plan Catalog — Implementation Plan

> Goal (plain words): Give admins ONE place to **create / edit plans fast** and apply
> them to **one company, many, or everyone (global)** — instead of re-typing plan
> details every time. Plans are organised as **Feature → Plans → Sub-features**.

---

## 1. The structure we agreed on

```
Feature: Sahay
   │  (master sub-feature list: Auto-charts, Dashboards, AI insights, Basic Q&A …)
   │
   ├─ Plan: Sahay Standard  →  Auto-charts ❌  Dashboards ❌  Basic Q&A ✅
   ├─ Plan: Sahay Pro       →  Auto-charts ✅  Dashboards ✅  Basic Q&A ✅
   └─ Plan: Sahay Max       →  everything ✅

Feature: Email
   ├─ Plan: Email Standard  →  Scheduled emails ✅
   └─ Plan: Email Max       →  Scheduled emails ✅  AI summaries ✅
```

- **Feature** = main product (Sahay, Email, more later)
- **Plan** = a tier you sell under a feature (price + cycle + which sub-features are ON)
- **Sub-feature** = a capability line, chosen from the feature's defined master list
  (each has a stable `key` so it can drive real on/off behaviour later)

### Decisions locked
- **Plan reach:** Global, with per-company override.
- **Sub-features:** Defined master list per feature (tick ON/OFF on a plan), not free-typed.
- **Sub-feature behaviour:** stored + shown now (label + key + enabled); wired to real
  app behaviour LATER, feature by feature (no schema change needed then).

---

## 2. Where data lives (the database boundary — important)

| Data | Table | Database | Why |
|------|-------|----------|-----|
| Main products | `Feature` | **Global Indus DB** | shared across all companies |
| Master sub-feature list per feature | `FeatureSubFeature` | **Global Indus DB** | shared |
| Plan tiers + which sub-features ON | `FeaturePlan` | **Global Indus DB** | shared catalog |
| Who owns what (per company) | `CompanyFeatureSubscription` (+ new `PlanID`) | **Tenant (client) DB** | enforced where used |
| Per-user Sahay entitlement | `UserMaster.PremiumFeatures` (JSON) | **Tenant DB** | unchanged |

> ⚠️ Plans are GLOBAL, subscriptions are PER-TENANT (different databases). SQL Server
> can't enforce a cross-database foreign key, so the tenant subscription row stores
> `PlanID` as a **soft reference** (a value, not an FK constraint). Normal for multi-tenant.

---

## 3. Table designs (global Indus DB — idempotent, follow Program.cs pattern)

### 3.1 `Feature`
- `FeatureID` INT IDENTITY PK
- `FeatureCode` NVARCHAR(20) UNIQUE  — 'Sahay' | 'Email' | …
- `FeatureName` NVARCHAR(100)
- `IsActive` BIT DEFAULT 1
- `CreatedAt`, `UpdatedAt`

### 3.2 `FeatureSubFeature` (master list per feature)
- `SubFeatureID` INT IDENTITY PK
- `FeatureID` INT  → references Feature (same DB, real FK OK here)
- `SubFeatureKey` NVARCHAR(50)   — stable key, e.g. 'auto_charts'
- `SubFeatureLabel` NVARCHAR(150) — display, e.g. 'Auto-charts & visualisation'
- `IsActive` BIT DEFAULT 1
- UNIQUE (FeatureID, SubFeatureKey)

### 3.3 `FeaturePlan` (the tiers)
- `PlanID` INT IDENTITY PK
- `FeatureID` INT → references Feature
- `PlanName` NVARCHAR(100)
- `BillingCycle` NVARCHAR(10)  — 'MONTHLY' | 'ANNUAL'
- `UnitPrice` DECIMAL(12,2)
- `PerUser` BIT
- `SubFeaturesJson` NVARCHAR(MAX) — list of { key, label, enabled } for this plan
- `RazorpayPlanId` NVARCHAR(64) NULL — filled/cached when used for checkout
- `IsActive` BIT DEFAULT 1
- `CreatedAt`, `UpdatedAt`

### 3.4 `CompanyFeatureSubscription` (tenant DB — add columns)
- ADD `PlanID` INT NULL              — soft reference to the global plan applied
- ADD `SubFeaturesJson` NVARCHAR(MAX) NULL — snapshot/override of sub-features for this company
- (existing columns unchanged)

---

## 4. Build order (chunks)

### Chunk 1 — Foundation + Manage Plans screen  ← START HERE
- [ ] 1.1 Tables `Feature`, `FeatureSubFeature`, `FeaturePlan` (idempotent migration in `Backend/Program.cs`)
- [ ] 1.2 Seed existing reality: Features (Sahay, Email) + their current plans (Sahay Pro, Email Standard) so nothing is lost
- [ ] 1.3 Backend DTOs + Service + Controller: CRUD for Feature, SubFeature, Plan
- [ ] 1.4 Register service in `Program.cs`
- [ ] 1.5 Frontend API functions + interfaces in `services/api.ts`
- [ ] 1.6 **Manage Plans** page: pick/create Feature → edit its sub-feature list → create/edit Plans ticking sub-features ON/OFF
- [ ] 1.7 Route + sidebar entry (admin/indus login only)
- [ ] 1.8 Verify: create a feature, add sub-features, build a plan, see it persist (desktop + mobile)

### Chunk 2 — Apply plan to companies
- [ ] 2.1 Add `PlanID` + `SubFeaturesJson` to tenant `CompanyFeatureSubscription` (idempotent)
- [ ] 2.2 Backend: "apply plan" endpoint — pick plan → one / many / All companies → upsert each tenant row
- [ ] 2.3 Per-company override (edit sub-features for one company without changing the global plan)
- [ ] 2.4 Frontend: company picker (single / multi / All) on the plan
- [ ] 2.5 Verify against a couple of tenant DBs

### Chunk 3 — Razorpay wiring (IndusWebApi)
- [ ] 3.1 `EnsureRazorpayPlan` / checkout read plan from `FeaturePlan` (not the hardcoded `ResolvePlan` switch)
- [ ] 3.2 Cache `RazorpayPlanId` back onto `FeaturePlan`
- [ ] 3.3 Verify create-subscription still works end-to-end

### Chunk 4 — Cleanup
- [ ] 4.1 Delete Razorpay `Plan:` rows (33/34) from `IntegrationConfig` (SQL handed to user to run)
- [ ] 4.2 Remove dead `ResolvePlan` hardcoded tiers once catalog is the source of truth

### Later (separate, per-feature)
- [ ] Honor each sub-feature `enabled` flag in real Sahay/Email behaviour, one feature at a time

---

## 5. Notes / constraints
- Internal-App: ASP.NET Core 8 + Dapper; migrations are idempotent in `Backend/Program.cs`.
- Indus DB connection = `IndusConnection` (global). Tenant DB = resolved via session/registry.
- No live secrets in git. No production writes from here — schema SQL is handed to the user to run.
- Branch: feature branch recommended (Internal-App is currently on `main`).

## 5b. UPDATE — moved to a 2-table model + catalog-driven dashboard (2026-06-23)

The 3-table design (Feature / FeatureSubFeature / FeaturePlan) was simplified to
**2 tables** by decision: drop the `FeatureSubFeature` master list; sub-features
are stored inline on the plan as JSON. `FeaturePlan` also gained the
customer-facing card fields so the dashboard is fully catalog-driven:

`FeaturePlan` added columns: `PlanCode`, `PlanDisplayName`, `AnnualPrice`,
`Blurb`, `FeaturesJson`, `PerUserNote`, `Highlight`, `Badge`
(SQL: `Database/FeaturePlan-catalog-columns.sql`, run against the Indus DB).

**Hardcoded fallbacks removed (the actual goal):**
- Frontend dashboard: deleted `src/components/common/subscriptionPlans.js`;
  `SubscriptionWindow.jsx` now fetches `/sahay/catalog-plans`.
- IndusWebApi: `ResolvePlan` reads `FeaturePlan` by `PlanCode` (legacy switch kept
  only as a fallback); new `GET api/sahay/catalog-plans` serves the cards.

Manage Plans (Internal App) edits all the new fields; the SubFeature master-list
UI/endpoints/DTOs were removed. Backend builds clean; both frontends typecheck.

## 6. Progress log
- **Chunk 1 DONE (code):** Catalog migration + seed in `Program.cs`; backend DTOs
  (`PlanCatalogDtos.cs`), service (`PlanCatalogService.cs`), controller
  (`PlanCatalogController.cs`), DI registration; frontend API block in `api.ts`,
  `ManagePlans.tsx` page, route in `App.tsx` (indus-only), Sidebar "Manage Plans".
  Backend builds 0 errors; frontend `tsc --noEmit` passes.
- **Runtime verify BLOCKED on DB:** dev DB (`DESKTOP-L96U5S2\MSSQLSERVER03`) is not
  reachable from this machine, so the startup migration logs `Plan Catalog Init Error
  (error 26)` like every other migration. Code is correct; tables + seed will be
  created automatically once `appsettings.Development.json` points at a reachable
  SQL Server. → Need a working DB connection string to finish end-to-end verify.
