# ExcelJet — Standard Operating Procedure (SOP) & Training Manual

**Document Version:** 1.0  
**Application Name:** ExcelJet  
**Prepared For:** New Employees / End Users  
**Technology:** ASP.NET Core 8 Web API · React 18 + TypeScript · Microsoft SQL Server  
**Domain:** ERP Master Data Management & Bulk Import System  
**Production URL:** https://bulkimport.vercel.app  

---

> **How to Read This Manual**
> Read it from top to bottom on your first day. Each section builds on the previous one.
> Use the Table of Contents to jump back to any topic when you need a quick reference later.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Login & User Access](#2-login--user-access)
3. [Complete Workflow — Start to Finish](#3-complete-workflow--start-to-finish)
4. [Module-Wise Detailed Explanation](#4-module-wise-detailed-explanation)
   - 4.1 Dashboard
   - 4.2 Import Master
   - 4.3 Stock Upload
   - 4.4 Company Master
   - 4.5 New Module Addition
   - 4.6 Module Authority
   - 4.7 Content Authority
   - 4.8 ERP Transaction Delete
   - 4.9 Company Subscription *(Indus Admin only)*
   - 4.10 Module Group Authority *(Indus Admin only)*
5. [UI Buttons & Actions Explanation](#5-ui-buttons--actions-explanation)
6. [Process Flow Diagram](#6-process-flow-diagram)
7. [Validations & Business Rules](#7-validations--business-rules)
8. [Error Handling](#8-error-handling)
9. [Reports & Dashboard](#9-reports--dashboard)
10. [Training Guide (Day-by-Day Plan)](#10-training-guide-day-by-day-plan)
11. [Best Practices](#11-best-practices)

---

## 1. Introduction

### 1.1 Purpose of the Application

ExcelJet is a **web-based ERP data management system** designed to:

- Allow businesses to **bulk-import master data** (Ledger, Items, HSN codes, Spare Parts, Tools) from Microsoft Excel files directly into their ERP database.
- Allow businesses to **upload opening stock** for items, spare parts, and tools.
- Provide system administrators with tools to **manage modules, companies, and user authorities**.

Think of ExcelJet as the **data gateway** between your Excel spreadsheets and your company's live ERP database. Instead of manually entering hundreds of records one by one, ExcelJet lets you upload a complete Excel file and import all records in one click — with full validation and duplicate checking before anything is saved.

### 1.2 Business Problems It Solves

| Business Problem | How ExcelJet Solves It |
|---|---|
| Manual data entry is slow and error-prone | Upload Excel files with thousands of rows in one step |
| No way to check data before saving | Preview mode shows all data before importing |
| Duplicate records pollute the database | Automatic duplicate detection before import |
| No control over which ERP modules are active | Module Authority controls what each company can access |
| Difficult to manage multiple company databases | Multi-tenant architecture with separate DB per company |
| Opening stock setup takes days | Bulk stock upload with warehouse & bin assignment |

### 1.3 Who Will Use This System (User Roles)

There are **two types of users** in ExcelJet:

---

#### Role 1 — Company User (Regular User)

**Who they are:** Staff at a client company (e.g., a printing factory) who need to import and manage their own data.

**What they can access:**
- Dashboard
- Import Master (upload Ledger, Item, HSN, Spare Part, Tool data)
- Stock Upload (upload opening stock for items, tools, spare parts)
- Company Master (view and edit company profile)
- New Module Addition (create/manage ERP modules for their company)
- Module Authority (enable or disable specific ERP modules)
- Content Authority (sync product content from the central catalog)
- ERP Transaction Delete (safely delete master or transaction data)

---

#### Role 2 — Indus Admin (Super Administrator)

**Who they are:** Staff at Indus Analytics (the software company) who provision and manage client companies.

**What they can access:**
- Company Subscription (create new client companies, set up databases)
- Module Group Authority (define groups of modules and apply them to clients)

> **Important:** Indus Admin users CANNOT see the regular company modules (Dashboard, Import Master, etc.) — they only see their own admin tools. Likewise, Company Users cannot see the Indus Admin screens.

---

## 2. Login & User Access

### 2.1 The Two-Step Login Process

ExcelJet uses a **two-step login**. You must first select your company, then enter your personal credentials.

**Why two steps?** Because the system connects to a completely separate database for each company. Step 1 establishes which database to use. Step 2 verifies your identity within that company.

---

### 2.2 Step-by-Step Login Instructions

#### STEP 1 — Company Selection

1. Open your web browser (Chrome, Edge, or Firefox recommended).
2. Navigate to: **https://bulkimport.vercel.app**
3. You will see the **Company Login** screen.
4. You have two options:

   **Option A — Login as a Company User:**
   - In the **Company Code** field, type your company's unique code (provided by your administrator).
   - In the **Password** field, type the company password.
   - Click the **"Login as Company"** button (blue arrow button).

   **Option B — Login as Indus Admin:**
   - In the **Username** field, type your Indus admin username.
   - In the **Password** field, type your Indus admin password.
   - Click the **"Login as Indus"** button.

5. If the company code and password are correct, the system will automatically take you to **Step 2**.

---

#### STEP 2 — User Login

1. After Step 1, you will see the **User Login** screen. Notice it shows the company name at the top — confirm it is the correct company.
2. Enter your personal **Username**.
3. Enter your personal **Password**.
4. Select the **Financial Year** from the dropdown (e.g., 2024-25).
5. Click the **"Login"** button (or press Enter).
6. If your credentials are correct, you will be taken directly to the **Dashboard**.

> **Tip:** If you accidentally end up at the wrong step, click the **"← Back"** button to return to company selection.

---

### 2.3 What Happens After Login

- Your session is secured with a **JWT token** (an encrypted digital pass) that is stored in your browser.
- This token expires after a set number of hours. When it expires, you will be automatically redirected back to the login screen.
- The system knows which company's database to use for all your actions throughout the session.

---

### 2.4 Logging Out

- Click your **username or profile icon** in the top-right corner of the Header.
- Select **"Logout"**.
- You will be taken back to the Company Login screen.
- Your session is fully cleared and secure.

---

### 2.5 Dashboard Overview After Login

After logging in as a **Company User**, you see the **Dashboard** with four quick-stats cards:

| Card | What It Shows |
|---|---|
| Total Imports | Number of import operations performed |
| Success Rate | Percentage of successful imports |
| Active Modules | Number of ERP modules currently active |
| Total Users | Number of registered users in the system |

Below the stats, you see:
- **Recent Activity** — a list of recent import operations with timestamps.
- **Quick Actions** — shortcut buttons for "New Import" and "View Reports".

---

## 3. Complete Workflow — Start to Finish

This section walks you through the most common end-to-end scenario: **importing master data from an Excel file into the ERP system**.

### 3.1 The Full Journey (Real-Life Example)

**Scenario:** A new printing company "ABC Prints Pvt Ltd" has just started using the ERP. They have 500 ledger accounts and 1,200 items already recorded in Excel. They need to import all this data into the system.

---

```
START
  │
  ▼
[1] Company Admin logs in (Company Code + Password → User + Password)
  │
  ▼
[2] Go to "Import Master" from the sidebar
  │
  ▼
[3] Select Module = "Ledger Masters" from dropdown
  │
  ▼
[4] Select the Ledger Group (e.g., "Sundry Debtors")
  │
  ▼
[5] Download the Excel template (so you know the correct column format)
  │
  ▼
[6] Fill in your data in the Excel template
  │
  ▼
[7] Upload the Excel file by clicking "Choose File" / drag and drop
  │
  ▼
[8] Click "Preview" — the system reads the file and shows all rows on screen
  │
  ▼
[9] Review the preview. Check for highlighted errors (red rows = problems)
  │
  ▼
[10] If all looks good, click "Import" — data saves to the database
  │
  ▼
[11] A success message shows how many records were imported
  │
  ▼
[12] Repeat for Item Master, HSN Master, Spare Parts, Tools as needed
  │
  ▼
[13] Go to "Stock Upload" to enter opening stock quantities
  │
  ▼
END — All master data and opening stock are now live in the ERP
```

---

### 3.2 Sequence Summary

| Step | Action | Who Does It | Where |
|---|---|---|---|
| 1 | Login | Company User | Login screen |
| 2 | Navigate to module | Company User | Sidebar |
| 3 | Select module type | Company User | Import Master page |
| 4 | Download template | Company User | Import Master page |
| 5 | Fill Excel data | Company User | Microsoft Excel |
| 6 | Upload file | Company User | Import Master page |
| 7 | Preview data | System + User | Import Master page |
| 8 | Fix errors if any | Company User | Excel file |
| 9 | Import confirmed data | Company User | Import Master page |
| 10 | Upload stock | Company User | Stock Upload page |

---

## 4. Module-Wise Detailed Explanation

---

### 4.1 Dashboard

**Module Name:** Dashboard  
**Menu Path:** Sidebar → Dashboard (Home icon)  
**URL:** /dashboard

#### Purpose
The Dashboard is the home screen after login. It gives a quick visual summary of system activity.

#### When to Use
- Every time you log in — it is the first screen you see.
- When you want a quick overview of how many records have been imported.

#### What You See

**Stats Cards (top row):**

| Card | Description |
|---|---|
| Total Imports | Total count of all bulk import operations done in this company |
| Success Rate | Percentage of imports that completed without errors |
| Active Modules | How many ERP modules are currently switched on |
| Total Users | Number of users registered under this company |

**Recent Activity Panel (bottom-left):**
- Shows the last 4 import activities.
- Each entry shows the module name and how long ago it happened (e.g., "2 hours ago").

**Quick Actions Panel (bottom-right):**
- **New Import** button — jumps directly to the Import Master page.
- **View Reports** button — reserved for future reporting features.

#### Real-Life Example
ABC Prints logs in on Monday morning. The dashboard shows "Total Imports: 1,234" and "Success Rate: 98.5%". The manager can immediately see that last Friday, Item Master was imported (shown in Recent Activity).

---

### 4.2 Import Master

**Module Name:** Import Master  
**Menu Path:** Sidebar → Import Master  
**URL:** /import-master

#### Purpose
This is the most important module in ExcelJet. It allows you to upload Excel files to bulk-import master data (foundation records) into the ERP database. It supports 6 types of master data.

#### When to Use
- When setting up a new company (first-time data load).
- When you have new ledgers, items, HSN codes, spare parts, or tools to add.
- When data needs to be refreshed from an updated Excel file.

#### Supported Master Types

| Master Type | What It Contains |
|---|---|
| Ledger Master | Accounts, parties, vendors, customers |
| Item Master | Products, raw materials, finished goods |
| HSN Master | GST tax codes and descriptions |
| Spare Part Master | Spare parts for machinery maintenance |
| Tool Master | Tools used in production |

#### Step-by-Step Usage

**Step 1 — Select the Module**
1. On the Import Master page, find the **"Module Name"** dropdown at the top.
2. Click the dropdown and select the type of master you want to import:
   - **Ledger Masters** → for accounts/parties
   - **Item Masters** → for products/raw materials
   - **HSN Masters** → for tax codes
   - **Spare Part Master** → for spare parts
   - **Tool Master** → for tools

**Step 2 — Select the Sub-Module / Group (if applicable)**

- For **Ledger Masters**: A second dropdown appears asking for the **Ledger Group** (e.g., "Sundry Debtors", "Bank Accounts"). Select the relevant group. This tells the system which category these ledgers belong to.
- For **Item Masters**: A second dropdown appears asking for the **Item Group** (e.g., "Raw Material", "Finished Goods"). Select the group.
- For **HSN Masters**: No sub-module needed. Skip to Step 3.
- For **Spare Part Master**: Auto-selects "Spare Part Master". Skip to Step 3.
- For **Tool Master**: A dropdown appears for **Tool Group**. Select the group.

**Step 3 — View the Master Data Grid**

After selecting the module (and sub-module if needed), the system automatically loads the relevant **master data grid** below. This shows all currently existing records in the database so you can see what is already there before adding more.

For each master type, a specialized grid appears:
- **Ledger Master Enhanced Grid** — shows all existing ledger accounts with inline editing.
- **Item Master Enhanced Grid** — shows all existing items.
- **HSN Master Enhanced Grid** — shows existing HSN codes.
- **Spare Part Master Enhanced Grid** — shows existing spare parts.
- **Tool Master Enhanced Grid** — shows existing tools.

These grids support:
- Searching/filtering records.
- Inline editing of individual fields.
- Exporting existing data to Excel.

**Step 4 — Prepare Your Excel File**

Before uploading:
- Download the **Excel template** from the grid (look for an "Export" or "Template" button).
- Open the downloaded template in Microsoft Excel.
- Fill in your data following the exact column headers shown.
- Save the file as `.xlsx` or `.xls`.

> **Critical Rule:** The column headers in your Excel file MUST match exactly what the template shows. Even a small typo in a header will cause the import to fail.

**Step 5 — Upload the Excel File**

1. Scroll up to the top of the page.
2. Either **drag and drop** your Excel file onto the upload area, or click **"Choose File"** and browse to your file.
3. The file name will appear confirming it is selected.

**Step 6 — Preview the Data**

1. Click the **"Preview"** button.
2. The system reads your entire Excel file and displays all rows in a table on screen.
3. **Do not skip this step.** Preview is your safety net.
4. Look for any **highlighted rows** — these indicate problems such as:
   - Missing required values.
   - Duplicate entries that already exist in the database.
   - Values that do not match expected formats.
5. You can **resize columns** by dragging the column border in the header.

**Step 7 — Decide: Fix or Import**

- If the preview looks **clean** (no red/highlighted rows): proceed to click **"Import"**.
- If there are **errors** in some rows: close the preview, fix the Excel file, and re-upload.

**Step 8 — Import**

1. Click the **"Import"** button.
2. A confirmation dialog will appear asking you to confirm.
3. Click **"Yes, Import"**.
4. The system processes all rows. A progress indicator may show for large files.
5. A success message appears telling you exactly how many records were imported.

#### Field-Level Explanation (Ledger Master Example)

| Field Name | What It Means | Required? | Example |
|---|---|---|---|
| LedgerName | Full name of the account/party | Yes | "ABC Printing Co." |
| LedgerGroupName | Which group this ledger belongs to | Yes | "Sundry Debtors" |
| OpeningBalance | Balance at the start of the year | No | 50000.00 |
| DrCr | Debit or Credit balance indicator | Yes | "Dr" or "Cr" |
| Address | Party's address | No | "123 Main St, Mumbai" |
| Phone | Contact number | No | "9876543210" |
| GSTNumber | GST registration number | No | "27AABCU9603R1ZV" |
| PANNumber | PAN card number | No | "AABCU9603R" |

#### Validations and Rules

- **Duplicates:** If a ledger with the same name already exists in the database, it will be flagged in preview as a duplicate and will NOT be re-imported.
- **Required fields:** If a required field is blank, that row will be rejected.
- **File size:** Maximum file size is 500 MB.
- **File type:** Only `.xlsx` and `.xls` files are accepted.

#### Real-Life Example

ABC Prints has 200 vendor accounts listed in an Excel file. They:
1. Select "Ledger Masters" → "Sundry Creditors".
2. Upload the Excel file.
3. Click Preview — sees 200 rows, 5 highlighted as duplicates (already in system).
4. The preview shows 195 valid new records.
5. Click Import — 195 records are imported. The 5 duplicates are skipped.
6. Success message: "195 records imported successfully."

---

### 4.3 Stock Upload

**Module Name:** Stock Upload  
**Menu Path:** Sidebar → Stock Upload  
**URL:** /stock-upload

#### Purpose
This module is used to upload the **opening stock** for items, spare parts, and tools. Opening stock means the quantity of goods you have on hand when you first start using the ERP system.

#### When to Use
- When setting up a company for the first time and you need to enter how many units of each item are currently in stock.
- When adding stock for a new item group.

#### Supported Stock Types

| Stock Type | What It Is |
|---|---|
| Item Masters | Stock quantities for manufactured/traded items |
| Spare Part Master | Stock of maintenance spare parts |
| Tool Master | Quantity of tools available |

#### Step-by-Step Usage

**Step 1 — Select the Module**
1. On the Stock Upload page, click the **"Module Name"** dropdown.
2. Select one of:
   - **Item Masters**
   - **Spare Part Master**
   - **Tool Master**

**Step 2 — Select the Sub-Module (Item Masters and Tool Master only)**
- For **Item Masters**: A second dropdown ("Sub Module Name") appears listing all item groups. Select the group (e.g., "Finished Goods").
- For **Tool Master**: A second dropdown appears listing tool groups. Select the group.
- For **Spare Part Master**: No sub-module selection needed — it auto-fills.

**Step 3 — The Stock Upload Grid Appears**

A detailed grid loads below showing the items/parts/tools in the selected group. This grid has special features:

For **Item Stock Upload**, the grid shows:

| Column | Meaning |
|---|---|
| Item Name | Name of the item from master data |
| Item Code | Unique code for the item |
| Warehouse | Which warehouse location holds this stock |
| Bin | Specific bin/shelf within the warehouse |
| Opening Qty | Number of units you have in stock |
| Unit | Unit of measurement (kg, pcs, meters, etc.) |
| Rate | Cost per unit |
| Status | Valid / Duplicate / Missing / Error |

**Step 4 — Load or Upload Data**

You have two options:

**Option A — Upload from Excel:**
1. Click **"Upload Excel"** button.
2. Select your Excel file containing stock data.
3. The file data populates the grid.
4. Each row is colour-coded:
   - **Green** = Valid, ready to import.
   - **Yellow/Orange** = Warning (e.g., duplicate).
   - **Red** = Error (missing required field).

**Option B — Load from Database:**
1. Click **"Load Existing Stock"** button.
2. The system loads whatever stock data is already in the database for this group.
3. You can then edit values directly in the grid.

**Step 5 — Assign Warehouses and Bins**

For each row, select the **Warehouse** and **Bin** from dropdown cells inside the grid. These dropdowns are populated from the warehouses/bins already configured in the system.

**Step 6 — Validate**

1. Click the **"Validate"** button.
2. The system checks all rows for:
   - Valid item codes (item must exist in master data).
   - Valid warehouse and bin selection.
   - Duplicate entries.
   - Missing quantities or rates.
3. The filter bar at the top of the grid lets you filter by: All / Valid / Duplicate / Missing / Mismatch / Invalid.

**Step 7 — Import**

1. Once validation shows no errors, click **"Import Stock"**.
2. Confirm the import in the dialog box.
3. A progress bar tracks the import (especially useful for large files).
4. A success popup shows how many stock records were saved.

#### Reset Stock (Use with Extreme Caution)

There are two reset buttons in the Stock Upload module:
- **Reset Item Stock** — Permanently deletes all stock data for the selected item group and resets it to zero.
- **Reset Floor Stock** — Resets floor-level stock data.

> **WARNING:** Both reset operations require you to go through a **4-step security verification**:
> 1. Enter your username and password.
> 2. Enter a reason for the reset.
> 3. Solve a CAPTCHA math question (e.g., "What is 7 + 4?").
> 4. Final confirmation.
>
> **This action CANNOT be undone. Only authorised managers should perform resets.**

#### Real-Life Example

ABC Prints has 300 items in their "Finished Goods" group. They have counted physical stock in the warehouse and recorded it in Excel. They:
1. Select "Item Masters" → "Finished Goods".
2. Upload the Excel file.
3. Assign warehouses (e.g., "Warehouse A") and bins (e.g., "Row-3-Shelf-2") for each item.
4. Click Validate → all 300 rows are green (valid).
5. Click Import → 300 stock records saved.

---

### 4.4 Company Master

**Module Name:** Company Master  
**Menu Path:** Sidebar → Company Master  
**URL:** /company-master

#### Purpose
This module stores and manages your company's profile information. Think of it as the "Settings" page for your organisation. It controls which features and modules are active for your company.

#### When to Use
- When you first set up the company and need to enter official details.
- When your company address, phone, or GST number changes.
- When you need to enable or disable certain ERP features.

#### What You Can Set

**Basic Company Information:**

| Field | Description | Example |
|---|---|---|
| Company Name | Official registered company name | "ABC Prints Pvt Ltd" |
| Address | Registered office address | "Plot 45, Industrial Area, Pune" |
| Phone | Company contact number | "020-12345678" |
| Email | Company email address | "info@abcprints.com" |
| GST Number | GST registration number | "27AABCU9603R1ZV" |
| PAN Number | Company PAN | "AABCU9603R" |
| Website | Company website URL | "www.abcprints.com" |
| Financial Year Start | When your fiscal year begins | "April" |

**Feature Toggle Switches (Enable/Disable):**

These are ON/OFF switches for various ERP capabilities:

| Toggle | What It Controls |
|---|---|
| Inventory Module | Whether inventory/stock tracking is active |
| Manufacturing Module | Whether production/job-work is tracked |
| Sales Module | Whether sales orders and invoices are managed |
| Purchase Module | Whether purchase orders are managed |
| Payroll Module | Whether employee payroll is active |
| GST Module | Whether GST tax computation is active |
| Multi-Branch | Whether the company has multiple branches |
| Barcode | Whether barcode scanning is supported |
| MIS Reports | Whether management reports are available |

#### Step-by-Step Usage

**Viewing Company Information:**
- The page loads with all current company information displayed in a clean, read-only view.
- Fields show current values in grey text.

**Editing Company Information:**
1. Click the **"Edit"** button (pencil icon) at the top of the page.
2. All fields change from read-only to editable input boxes with a blue highlight.
3. Modify any field you need to change.
4. For feature toggles, click the toggle switch to turn a feature ON (blue) or OFF (grey).
5. Click **"Save"** to save all changes.
6. A confirmation message appears: "Company details saved successfully."

**Cancelling an Edit:**
- If you started editing but changed your mind, click **"Cancel"** (X button).
- All changes are discarded and the original values are restored.

#### Real-Life Example

ABC Prints just got GST registered. The accountant logs in, goes to Company Master, clicks Edit, types in the new GST number, and saves. The GST number is now visible on all documents generated by the ERP.

---

### 4.5 New Module Addition (Module Authority — Create/Edit Modules)

**Module Name:** New Module Addition  
**Menu Path:** Sidebar → New Module Addition  
**URL:** /module-authority  

#### Purpose
This module shows all the ERP modules that have been added for your company. It also provides the ability to **create new modules** or **edit/delete existing ones**. An "ERP Module" here means a specific screen or function inside the main ERP application (e.g., "Sales Invoice Entry", "Purchase Order", "Job Sheet").

#### When to Use
- When your company needs a new feature that is not yet showing in the ERP.
- When you want to rename or update an existing module.
- When a module is no longer needed and should be removed.

#### Understanding the Grid

The main screen shows a **data grid** (table) listing all active modules with columns such as:
- **Module Name** — The internal database name of the module.
- **Module Display Name** — What users see in the ERP menu.
- **Module Head Name** — The category/section this module belongs to.
- **Display Order** — The position number in the menu (lower number = appears higher).
- **Set Group Index** — Grouping index for organising modules.

#### Creating a New Module

1. Click the **"Create Module"** button (green button with + icon in the grid toolbar).
2. You are taken to the **Create Module** form.
3. Fill in the following fields:

| Field | Description | Required | Example |
|---|---|---|---|
| Module Name | Internal system name (no spaces, use underscores) | Yes | "Sales_Invoice" |
| Module Display Name | What appears in the ERP menu | Yes | "Sales Invoice" |
| Module Head Name | Category name (selectable from IndusEnterprise) | Yes | "Sales" |
| Module Head Display Name | Display label for the category | Yes | "Sales Management" |
| Module Head Display Order | Order number of the category | Yes | 3 |
| Module Display Order | Order number of this module within its category | Yes | 1 |
| Set Group Index | Grouping number for tab-group organisation | Yes | 1 |
| Print Document Webpage | URL of print page (if this module prints documents) | No | "/print/sales-invoice" |
| Print Document Name | Label for the print option | No | "Print Invoice" |

4. Click **"Save Module"** to create it.
5. You are taken back to the Module list where the new module appears.

#### Editing a Module

1. In the grid, find the module you want to edit.
2. Click the **pencil (Edit) icon** on that row.
3. You are taken to the same Create Module form, now pre-filled with existing data.
4. Update the fields you need to change.
5. Click **"Save Module"**.

#### Deleting a Module

1. In the grid, find the module you want to delete.
2. Click the **trash (Delete) icon** on that row.
3. A confirmation popup appears. Confirm the deletion.
4. The module is removed.

> **Warning:** Deleting a module here removes it from the company's module list. Only delete modules that are truly no longer needed, as this affects what the ERP users can see.

#### Real-Life Example

ABC Prints decides to start using an "Estimation" module in their ERP. The admin goes to New Module Addition, clicks "Create Module", fills in "Estimation" as the Display Name, sets its category to "Production", sets Display Order to 5, and saves. Now the Estimation module appears in the ERP.

---

### 4.6 Module Authority (Dynamic Module — Enable/Disable Modules)

**Module Name:** Module Authority  
**Menu Path:** Sidebar → Module Authority  
**URL:** /dynamic-module

#### Purpose
While "New Module Addition" creates modules, this screen controls **which modules are currently active (turned on) for your company's ERP product**. You can enable or disable individual modules with a single checkbox toggle.

This is the difference:
- **New Module Addition** = Managing the list of available modules.
- **Module Authority** = Switching specific modules ON or OFF.

#### When to Use
- When your company has subscribed to a new feature and you need to turn it on.
- When a feature should be temporarily disabled.
- When doing initial setup and selecting which modules apply to your business.

#### Step-by-Step Usage

**Step 1 — Select Product**

At the top of the page, there is a **Product** dropdown. Select which ERP product you are managing modules for (e.g., "Estimoprime").

**Step 2 — Show Modules**

Click the **"Show Modules"** button. The system fetches the list of all available modules from the source database and displays them in a grid.

**Step 3 — Review the Grid**

The grid shows:

| Column | Description |
|---|---|
| Module Name | Name of the module |
| Display Name | Friendly name shown in the ERP |
| Head Name | Category of the module |
| Status (Checkbox) | Checked = Active, Unchecked = Inactive |

**Step 4 — Toggle Modules**

- Click the **checkbox** in any row to toggle that module ON or OFF.
- You can also use the **"Select All"** button at the top to activate all visible modules at once.
- The grid's search/filter tools let you find specific modules by name.

**Step 5 — Save**

1. After making your selections, click the **"Save Authority"** button.
2. A confirmation dialog appears.
3. Confirm → The system saves all changes.
4. A success message shows how many modules were updated.

#### Real-Life Example

ABC Prints has just paid for the "Dispatch" module. The admin goes to Module Authority, searches for "Dispatch" in the grid, checks its checkbox, and clicks Save. The Dispatch module now appears in the ERP for all ABC Prints users.

---

### 4.7 Content Authority

**Module Name:** Content Authority  
**Menu Path:** Sidebar → Content Authority  
**URL:** /content-authority

#### Purpose
This module manages **product content** — specifically, which "Contents" (types of printed products or materials, such as envelope styles, card types, reel types, etc.) are active for your company. Each content can have an associated image (open view and closed/folded view).

The system reads content definitions from a **central master catalog** (managed by Indus Analytics) and lets you selectively sync which ones apply to your company.

#### When to Use
- When your company starts producing a new type of product/content that needs to be added to the ERP.
- When you need to deactivate a content type your company no longer produces.
- When the technical specifications (dimensions, coordinates) for a content type have been updated in the central catalog.

#### Understanding the Status Badges

Each content item shows one of three status badges:

| Badge Colour | Status | Meaning |
|---|---|---|
| Green — "Synced" | Active | Content exists in your DB and is active |
| Amber — "Inactive" | Inactive | Content exists in your DB but is turned off |
| Grey — "Not Synced" | Not synced | Content exists in the catalog but NOT in your DB |

#### Statistics Bar (Top of Page)

Four summary numbers are displayed:

| Stat | What It Shows |
|---|---|
| Total Content | Total content types in the central catalog |
| Synced | How many are active in your company database |
| Inactive | How many exist in your DB but are turned off |
| Access Changes | How many items have unsaved changes in this session |

#### Step-by-Step Usage

**Loading Content:**
- The page automatically loads all content when you open it.
- Click **"Refresh"** to reload the latest data from both databases.

**Searching and Filtering:**
- Use the **search box** to type a content name and filter the list.
- Use the **filter dropdown** to show: All / Synced / Not Synced / Inactive.

**Selecting/Deselecting Content:**
- Click any row to toggle its checkbox (checked = selected = will be active).
- Click **"Select All"** / **"Deselect All"** to toggle all visible rows at once.

**Saving Access Changes:**
1. Select/deselect the content types you want.
2. The **"Save Content"** button shows a count badge of how many changes are pending.
3. Click **"Save Content"**.
4. A confirmation dialog asks you to confirm.
5. Confirm → The system applies the changes:
   - New content is **inserted** into your company database (with full data sync).
   - Existing inactive content is **reactivated**.
   - Deselected content is **deactivated** (not deleted, just turned off).

**Updating Technical Details:**

If Indus Analytics updates the physical specifications (dimensions, print coordinates) for existing content:
1. Select the content items whose specs need refreshing.
2. Click **"Update Content Details"**.
3. The system fetches the latest data from the central catalog and overwrites the technical specs in your company database.

> **Note:** "Save Content" only manages access (on/off). "Update Content Details" refreshes the technical data (dimensions, coordinates, print specs). These are two separate actions.

#### Viewing Content Images

Each content item has two image thumbnails:
- **Open View** — Shows the product opened flat.
- **Close View** — Shows the product in its folded/assembled state.

Hover over any thumbnail to zoom in. Click the **info (eye) icon** next to a thumbnail to open a full-screen image preview.

#### Real-Life Example

ABC Prints has started producing a new envelope style called "DL Window Envelope". Indus Analytics has added it to the central catalog. The ABC Prints admin opens Content Authority, finds "DL Window Envelope" in the list (showing "Not Synced"), clicks its row to select it, and clicks "Save Content". The envelope type is now available in ABC Prints' ERP for use in job orders.

---

### 4.8 ERP Transaction Delete

**Module Name:** ERP Transaction Delete  
**Menu Path:** Sidebar → ERP Transaction Delete  
**URL:** /erp-transaction-delete

#### Purpose
This is a **high-security module** for deleting master data or transaction data from the ERP. It exists because sometimes data needs to be corrected by removing incorrect records (e.g., a wrongly imported ledger group, or old financial year transactions that are no longer needed).

> **This is a destructive operation. Deleted data CANNOT be recovered. Only authorised personnel should use this module.**

#### Two Tabs

The page has two tabs:

**Tab 1 — Master Delete**
- Used to delete **master records** (e.g., all ledgers in a group, all items in an item group).
- Checks if master records are used in transactions before allowing deletion.

**Tab 2 — Transaction Delete**
- Used to delete **transaction records** (e.g., sales invoices, job orders).
- Requires stronger verification.

#### Step-by-Step Usage — Master Delete

**Step 1 — Select Module**
- Click the "Module Name" dropdown and select the type of master to delete (e.g., "Ledger Masters", "Item Masters").

**Step 2 — Select Sub-Module (if applicable)**
- For Item Masters and Ledger Masters, select the specific group (e.g., "Sundry Debtors").

**Step 3 — Check Usage**
- Click **"Check Usage"** button.
- The system checks the database to find how many transactions reference this master data.
- A report appears showing:
  - Total master records in the group.
  - How many are used in transactions.
  - How many are unused.

**Step 4 — Choose Delete Action**

Based on the usage check:

| Button | What It Does |
|---|---|
| Delete All Master Data | Deletes ALL records (used AND unused) — requires special auth |
| Delete Unused Only | Deletes only records not referenced in any transaction — safer |

**Step 5 — Authentication**
- A security dialog appears asking for:
  - Your **username**.
  - Your **password**.
  - A **reason** for the deletion (mandatory — this is logged for audit purposes).
- Click "Confirm Delete" after filling in credentials.

**Step 6 — Deletion Executes**
- A progress bar shows deletion progress (by table).
- A success popup shows how many records were deleted.

#### Step-by-Step Usage — Transaction Delete

Similar to Master Delete but with stronger verification:

1. Select Module and Sub-Module.
2. Click proceed — triggers a **4-step confirmation flow**:
   - **Step 1:** Enter username, password, and reason.
   - **Step 2:** Review summary of what will be deleted.
   - **Step 3:** Solve a **CAPTCHA math question** (e.g., "Enter the answer to: 13 + 7").
   - **Step 4:** Final confirmation — click "Yes, Delete Permanently".
3. Real-time progress shown as each table is cleared.

#### Real-Life Example

ABC Prints accidentally imported 50 incorrect ledger entries in the "Sundry Debtors" group. The finance manager goes to ERP Transaction Delete, selects "Ledger Masters" → "Sundry Debtors", checks usage (all 50 are unused), clicks "Delete Unused Only", enters credentials and reason ("Incorrect data imported on 15-Apr-2026"), and confirms. All 50 incorrect ledgers are removed.

---

### 4.9 Company Subscription *(Indus Admin Only)*

**Module Name:** Company Subscription  
**Menu Path:** Sidebar → Company Subscription  
**URL:** /company-subscription  
**Access:** Indus Admin login only

#### Purpose
This is the master control panel for **Indus Analytics staff** to provision and manage client companies. When a new client subscribes to ExcelJet/Estimoprime, an Indus Admin uses this screen to:
- Register the new company in the system.
- Set up the company's dedicated SQL Server database.
- Configure modules, branches, and production units.
- Manage the company's subscription and credentials.

#### Key Capabilities

| Feature | Description |
|---|---|
| Create Company | Register a new client company with a unique client code |
| Setup Database | Create a fresh SQL Server database for the company from a backup |
| Configure Modules | Choose which ERP modules the company has access to |
| Manage Branches | Set up branch offices for the company |
| Manage Production Units | Set up factory/plant units |
| Copy Modules | Copy module settings from another existing client |
| Backup & Transfer | Take a database backup and transfer it to a new server |
| Apply Module Group | Apply a pre-defined set of modules to the company in one click |

#### Step-by-Step: Creating a New Company

1. Click the **"+ Add Company"** button in the grid toolbar.
2. A multi-step setup wizard launches:

   **Step A — Company Details:**
   - Enter Company Name, Address, Phone, Email.
   - The system auto-generates the next available **Client Code** (e.g., "CLI003").
   - Confirm or modify the client code.

   **Step B — Database Setup:**
   - Select the **SQL Server** where the database will be created.
   - Select a **backup database** to restore from (this is the template database).
   - Click **"Setup Database"** — the system restores the backup to create a new database named after the client code.

   **Step C — Module Configuration:**
   - Select modules the company has subscribed to.
   - Or choose a **Module Group** to apply a pre-packaged set of modules.

   **Step D — Complete Setup:**
   - Confirm all settings.
   - Click **"Complete Setup"** — the company is fully registered and ready to use.

3. The new company now appears in the grid and the client can log in with their company code.

#### Real-Life Example

XYZ Packaging signs up for ExcelJet. An Indus Admin logs in, goes to Company Subscription, clicks "Add Company", follows the 4-step wizard, and within 10 minutes XYZ Packaging has a fully configured, independent database ready for use.

---

### 4.10 Module Group Authority *(Indus Admin Only)*

**Module Name:** Module Group Authority  
**Menu Path:** Sidebar → Module Group Authority  
**URL:** /module-group-authority  
**Access:** Indus Admin login only

#### Purpose
Instead of configuring modules one-by-one for every new company, an Indus Admin can create **Module Groups** — pre-packaged bundles of modules. When setting up a new company, the admin simply applies a group and all the modules in that bundle are activated instantly.

#### Example Groups

| Group Name | Modules Included |
|---|---|
| "Printing Standard" | Sales Invoice, Purchase, Job Sheet, Dispatch, Accounts |
| "Printing Premium" | Everything in Standard + Estimation, MIS, Payroll |
| "Basic Only" | Purchase, Accounts, Inventory |

#### Step-by-Step Usage

**Step 1 — Select Application**

From the **Application** dropdown at the top, select the product (e.g., "Estimoprime").

**Step 2 — View Existing Groups**

A list of existing module groups for that application loads in the left panel.

**Step 3 — Create a New Group**

1. Click **"+ Create Group"** button.
2. A dialog appears. Enter:
   - **Group Name** (e.g., "Printing Premium").
   - **Application** (auto-filled).
3. From the list of available modules, select which modules to include in this group.
4. Click **"Create"** to save the group.

**Step 4 — Edit a Group**

1. Select an existing group from the list.
2. The right panel shows all modules currently in that group.
3. Click **"Edit"** to toggle modules in/out of the group.
4. Click **"Save"** to update.

**Step 5 — Delete a Group**

1. Select the group.
2. Click **"Delete Group"**.
3. A security dialog asks for username, password, and reason.
4. Enter credentials and confirm.

#### Real-Life Example

Indus Admin notices that 5 new printing companies are all similar in size and needs. They create a "Standard Printing" module group with 15 modules. Now, every time a similar company is on-boarded, applying the group takes 10 seconds instead of configuring 15 modules manually.

---

## 5. UI Buttons & Actions Explanation

### 5.1 Global Buttons (Available Everywhere)

| Button | Location | What It Does |
|---|---|---|
| Sidebar Toggle (≡) | Top-left of Header | Opens/closes the sidebar on mobile |
| Collapse Arrow («») | Inside Sidebar Header | Collapses sidebar to icon-only mode on desktop |
| Dark/Light Theme Toggle | Header (right side) | Switches between dark and light colour themes |
| User Profile / Logout | Header (right side) | Shows user info and logout option |

### 5.2 Import Master Buttons

| Button | What It Does | When to Click |
|---|---|---|
| Preview | Reads the uploaded Excel and shows all rows on screen | After uploading a file, before committing data |
| Import | Saves validated data to the database | Only after reviewing the Preview |
| Choose File | Opens file browser to select Excel file | When ready to upload |
| Refresh (↺) | Clears the current selection and resets the form | When starting over |
| Export (Grid) | Downloads current master data to Excel | When you need a copy of existing data |

### 5.3 Stock Upload Buttons

| Button | What It Does |
|---|---|
| Upload Excel | Lets you select and upload an Excel file for stock |
| Load Existing Stock | Loads current stock from database into the grid |
| Load Master Template | Loads a template with all items but zero quantities |
| Validate | Runs validation checks on all rows in the grid |
| Import Stock | Saves validated stock data to the database |
| Reset Item Stock | Permanently deletes all stock for the group (requires auth) |
| Reset Floor Stock | Permanently deletes floor stock data (requires auth) |
| Refresh | Resets all selections and clears the grid |

### 5.4 Module Authority (New Module Addition) Buttons

| Button | What It Does |
|---|---|
| Create Module | Opens the module creation form |
| Edit (pencil icon) | Opens the edit form for that module |
| Delete (trash icon) | Deletes the module after confirmation |
| Search Panel | Filters the grid by typed text |
| Group Panel | Allows grouping rows by dragging column headers |
| Column Chooser | Show/hide specific columns in the grid |

### 5.5 Content Authority Buttons

| Button | What It Does |
|---|---|
| Refresh | Reloads content data from both databases |
| Save Content | Saves selected/deselected content access changes |
| Update Content Details | Refreshes technical specs from the central catalog |
| Select All / Deselect All | Toggles all visible rows' checkboxes |
| Search Box | Filters content list by name |
| Filter Dropdown | Filters list to: All / Synced / Not Synced / Inactive |
| Thumbnail (hover) | Zooms in on content image |
| Info Button (on image) | Opens full-screen image preview |

### 5.6 ERP Transaction Delete Buttons

| Button | What It Does |
|---|---|
| Check Usage | Checks how many transactions reference the selected master data |
| Delete All Master Data | Deletes all records (used and unused) — restricted |
| Delete Unused Only | Deletes only records not used in any transaction |
| Confirm Delete | Final confirmation to execute deletion |
| Cancel | Aborts the deletion process |

### 5.7 Company Subscription Buttons (Indus Admin)

| Button | What It Does |
|---|---|
| + Add Company | Opens the multi-step company setup wizard |
| Setup Database | Creates a new database from a backup on the selected server |
| Complete Setup | Finalises company registration |
| Edit (row) | Opens company details for editing |
| Delete (row) | Removes company subscription (requires confirmation) |
| Copy Modules | Copies module settings from another client |
| Apply Module Group | Applies a pre-defined module bundle to the company |
| Backup & Transfer | Initiates database backup and server-to-server transfer |

---

## 6. Process Flow Diagram

### 6.1 Master Data Import Flow

```
New Company Setup
      │
      ▼
Indus Admin creates company
(Company Subscription)
      │
      ▼
Database provisioned on SQL Server
      │
      ▼
Company User logs in (Step 1: Company Code → Step 2: Username)
      │
      ▼
Go to Import Master
      │
      ├──────────────────────────────────────┐
      ▼                                      ▼
Select "Ledger Masters"              Select "Item Masters"
      │                                      │
      ▼                                      ▼
Choose Ledger Group                   Choose Item Group
      │                                      │
      ▼                                      ▼
Upload Excel File                     Upload Excel File
      │                                      │
      ▼                                      ▼
Click Preview                         Click Preview
      │                                      │
      ▼                                      ▼
Review Data (Fix if needed)           Review Data (Fix if needed)
      │                                      │
      ▼                                      ▼
Click Import                          Click Import
      │                                      │
      ▼                                      ▼
Success: X records saved              Success: X records saved
      │
      ▼
Repeat for HSN, Spare Parts, Tools
      │
      ▼
Go to Stock Upload
      │
      ▼
Select Module → Sub-Module
      │
      ▼
Upload/Enter Opening Stock
      │
      ▼
Validate → Import
      │
      ▼
Master Data Setup COMPLETE
      │
      ▼
ERP is ready for daily operations
```

### 6.2 Module Activation Flow

```
Company subscribes to new ERP feature
            │
            ▼
Indus Admin goes to Module Group Authority
            │
            ▼
Creates/Updates Module Group (if needed)
            │
            ▼
Company Admin logs in
            │
            ▼
Goes to New Module Addition
            │
            ▼
Clicks "Create Module" → Fills details → Save
            │
            ▼
Module appears in Active Modules grid
            │
            ▼
Goes to Module Authority
            │
            ▼
Selects product, Clicks "Show Modules"
            │
            ▼
Finds new module, Checks its checkbox
            │
            ▼
Clicks "Save Authority"
            │
            ▼
Module is now LIVE in ERP for all users
```

### 6.3 Content Authority Flow

```
Indus Analytics adds new content to central catalog
            │
            ▼
Company Admin opens Content Authority
            │
            ▼
Page loads — shows "Not Synced" for new content
            │
            ▼
Admin searches for content by name
            │
            ▼
Admin clicks row to select it (checkbox turns on)
            │
            ▼
Clicks "Save Content"
            │
            ▼
System inserts content + child data into company DB
            │
            ▼
Status badge changes to "Synced" (green)
            │
            ▼
Content is now available in ERP for job orders
```

### 6.4 ERP Data Deletion Flow

```
Incorrect data detected in database
            │
            ▼
Authorised user opens ERP Transaction Delete
            │
            ▼
Selects Master or Transaction tab
            │
            ▼
Selects Module → Sub-Module
            │
            ▼
Clicks "Check Usage"
            │
            ├─────────────────┐
            ▼                 ▼
         Used?            Not Used?
            │                 │
            ▼                 ▼
   Requires special      Click "Delete
   auth to delete all    Unused Only"
            │                 │
            └────────┬────────┘
                     ▼
         Enter credentials + reason
                     │
                     ▼
         (Transaction Delete only)
         Solve CAPTCHA math question
                     │
                     ▼
         Final confirmation click
                     │
                     ▼
         Progress bar shows deletion
                     │
                     ▼
         Success popup: "X records deleted"
```

---

## 7. Validations & Business Rules

### 7.1 Login Rules

| Rule | Description |
|---|---|
| Company code is required | You cannot skip Step 1 |
| Financial year must be selected | Step 2 will not proceed without a year |
| Session expires | After the configured hours, you are logged out automatically |
| Invalid credentials | System shows "Invalid username or password" — 3 failed attempts may lock the session |

### 7.2 Excel Import Rules

| Rule | Description |
|---|---|
| File type | Only `.xlsx` and `.xls` accepted |
| File size | Maximum 500 MB |
| Column headers must match exactly | The Excel column names must be identical to the template |
| Required fields cannot be empty | Any row with a blank required field is rejected |
| Duplicates are skipped | If a record already exists (all columns match), it is not re-imported |
| Preview before import | You must click Preview first — Import button may be disabled until preview is done |

### 7.3 Stock Upload Rules

| Rule | Description |
|---|---|
| Item must exist in master | Stock cannot be added for an item not in the Item Master |
| Warehouse must be selected | Every stock row must have a warehouse |
| Bin must belong to selected warehouse | You cannot assign a bin from a different warehouse |
| Quantity must be positive | Negative stock quantities are not allowed |
| Validate before import | Import is blocked until all rows pass validation |

### 7.4 Module Management Rules

| Rule | Description |
|---|---|
| Module Name must be unique | Two modules cannot have the same internal name |
| Display Order must be unique within a group | Avoids menu ordering conflicts |
| Cannot delete a module in use | If a module has active data, deletion may be blocked |

### 7.5 Deletion Rules

| Rule | Description |
|---|---|
| Authentication required | All deletion actions require username + password |
| Reason is mandatory | A reason must be typed before deletion executes |
| CAPTCHA required for transaction delete | Adds an extra layer to prevent accidental deletion |
| Used records need special permission | Records referenced in transactions require elevated authority to delete |
| Action is irreversible | There is no "undo" button — deleted data is gone permanently |

### 7.6 Content Authority Rules

| Rule | Description |
|---|---|
| Content must exist in central catalog | You cannot add content that is not in the Indus master |
| Only IsActive flag changes on deselect | Deselecting content does NOT delete it from your database — it is just deactivated |
| New content triggers full data sync | When you select a "Not Synced" content for the first time, its child table data (sheets, coordinates) is also copied |

---

## 8. Error Handling

### 8.1 Login Errors

| Error Message | Why It Happens | How to Fix |
|---|---|---|
| "Invalid company code or password" | Wrong company credentials entered in Step 1 | Double-check the company code (case-sensitive) and try again |
| "Invalid username or password" | Wrong user credentials in Step 2 | Check your username and password — contact your admin if forgotten |
| "Session expired, please login again" | Your JWT session token has expired | Log in again from the beginning |
| Page stays blank after login | Network or server connection issue | Check your internet connection; try refreshing the page |

### 8.2 Import Master Errors

| Error / Situation | Why It Happens | How to Fix |
|---|---|---|
| "File type not supported" | You uploaded a .csv or .doc file | Save your file as .xlsx and re-upload |
| "Column headers do not match" | Your Excel has wrong or misspelled headers | Download the template again and match headers exactly |
| Red highlighted rows in preview | Those rows have missing required fields or invalid data | Go back to your Excel, fix those rows, save, and re-upload |
| "Import failed" after clicking Import | Server error or database connectivity issue | Wait a few seconds and try again; if persists, contact IT |
| Preview shows 0 rows | Empty Excel file or wrong sheet name | Make sure data is on the first sheet of the Excel file |
| Duplicate rows show in preview | Those records already exist in the database | These will be skipped automatically — no action needed |

### 8.3 Stock Upload Errors

| Error / Situation | Why It Happens | How to Fix |
|---|---|---|
| "Item not found in master" (red row) | The item code in your Excel does not match the Item Master | Correct the item code or first import the item into Item Master |
| Warehouse dropdown is empty | No warehouses are configured in the system | Contact admin to set up warehouses first |
| "Validation failed" | Some rows have invalid data | Use the filter to show "Invalid" rows only; fix each issue |
| Import stuck on progress bar | Large file being processed | Wait — do not close the tab; large imports can take several minutes |

### 8.4 Content Authority Errors

| Error | Why | Fix |
|---|---|---|
| "Failed to load content" | Cannot connect to central catalog database | Contact Indus support — the source server may be temporarily down |
| Image shows "Error" placeholder | Image file missing from the server | Contact Indus support to check image files |
| "Failed to save changes" | Database write error | Try again; if persists, check database connection |

### 8.5 ERP Transaction Delete Errors

| Error | Why | Fix |
|---|---|---|
| "Authentication failed" | Wrong username/password entered | Use your correct credentials — same ones you use to log in |
| "Captcha answer incorrect" | Math answer was wrong | Re-read the question carefully; note that it is a new random question each time |
| Progress bar freezes | Server timeout on large delete operation | Wait — do not refresh; the operation may still be running on the server |

### 8.6 General Application Errors

| Error | Why | Fix |
|---|---|---|
| White/blank screen | JavaScript error in browser | Press Ctrl+Shift+R (hard refresh) to clear browser cache |
| "401 Unauthorized" | Your session expired mid-operation | Log in again |
| "500 Internal Server Error" | Server-side problem | Contact IT or Indus support with the error details and time |
| Sidebar not loading | Poor network connection | Refresh the page |
| Theme does not switch properly | Browser cache issue | Hard refresh (Ctrl+Shift+R) |

---

## 9. Reports & Dashboard

### 9.1 Dashboard Statistics

The Dashboard shows four live statistics cards that update as data is added:

| Statistic | How It Is Calculated | How to Use It |
|---|---|---|
| Total Imports | Cumulative count of all import operations | Monitor how actively the team is uploading data |
| Success Rate | (Successful imports ÷ Total imports) × 100 | A rate below 95% suggests frequent errors in Excel files |
| Active Modules | Count of modules with IsActive = true | Confirm the expected number of modules are switched on |
| Total Users | Count of registered users in the company database | Audit user access |

### 9.2 Import Activity Log

The **Recent Activity** panel on the Dashboard shows the last 4 import events. For a full audit trail:

- The backend maintains an **Activity Log** via `ActivityLogService.cs`.
- All data modification events (Insert, Update, Delete, Clear) are logged automatically.
- The **Activity Log Viewer** component (`ActivityLogViewer.tsx`) can be accessed by admins to see the full chronological history of all operations.

Each log entry records:
- **Action Type** (Insert / Update / Delete / Clear)
- **Module/Table Name**
- **Number of Records Affected**
- **Timestamp**
- **User who performed the action**

### 9.3 How to Interpret Dashboard Data

**Healthy System Indicators:**
- Success Rate > 98%
- Active Modules = expected number
- Recent Activity shows regular imports

**Warning Signs:**
- Success Rate dropping below 95% → Team may be uploading incorrectly formatted Excel files; schedule a training session.
- No recent activity for several days → Data entry may have stopped; check with the team.
- Active Modules lower than expected → Some modules may have been accidentally deactivated; check Module Authority.

### 9.4 Stock Status Monitoring

Within the **Stock Upload** module, after loading data, the validation result provides a breakdown:

| Filter View | What to Check |
|---|---|
| Valid | These rows are ready to import |
| Duplicate | These rows already exist — decide whether to update or skip |
| Missing | Item exists in master but has no stock record yet |
| Mismatch | Warehouse/bin combination is invalid |
| Invalid | Row has errors that prevent import |

Use the filter buttons at the top of the grid to switch between these views and address each category systematically.

---

## 10. Training Guide (Day-by-Day Plan)

### Overview

This training plan is designed for a **new employee with no prior knowledge** of ExcelJet. It is structured over 5 days. Each day builds on the previous.

**Pre-requisite:** The trainer must have already created a test login account for the trainee.

---

### Day 1 — Orientation & Login

**Goal:** Understand what ExcelJet is and be able to log in independently.

**Morning (2 hours) — Theory:**

1. Trainer walks through Section 1 (Introduction) of this manual with the trainee.
2. Discuss: What is bulk import? Why do we use Excel? What problems does this solve?
3. Show the trainee the two user roles and which one applies to their job.

**Afternoon (2 hours) — Hands-On:**

1. Trainee opens https://bulkimport.vercel.app in a browser.
2. Trainer watches as trainee logs in using the two-step process.
3. Trainee explores the Dashboard — identify each statistic card.
4. Trainee toggles the sidebar (collapse/expand).
5. Trainee switches between dark and light themes.
6. Trainee logs out and logs back in independently.

**End-of-Day Check:**
- Can the trainee log in without help? ✓
- Can they identify the Dashboard elements? ✓

---

### Day 2 — Import Master (Ledger & Item)

**Goal:** Be able to import ledger master data from an Excel file.

**Morning (3 hours) — Ledger Import:**

1. Trainer explains what a Ledger is and why it is important.
2. Show the trainee the Import Master page.
3. Walk through selecting "Ledger Masters" and a ledger group.
4. Download the template together.
5. Fill in 10 sample ledger records in the template.
6. Upload the file and click Preview together.
7. Review the Preview — point out valid and duplicate rows.
8. Click Import and see the success message.

**Afternoon (2 hours) — Practice:**

1. Trainee prepares their own 20-record Ledger Excel file.
2. Trainee independently selects module, uploads, previews, and imports.
3. Trainer reviews for mistakes and provides feedback.

**End-of-Day Check:**
- Can trainee navigate to Import Master and select the correct module? ✓
- Can trainee upload, preview, and import without help? ✓

---

### Day 3 — Import Master (Items, HSN, Spare Parts, Tools)

**Goal:** Master all remaining import types.

**Morning (2 hours) — Item Master & HSN:**

1. Trainer explains Item Groups and why items are categorised.
2. Walk through Item Master import with a small sample file.
3. Walk through HSN Master import (simpler — no sub-module).
4. Trainee practises item and HSN imports independently.

**Afternoon (2 hours) — Spare Parts & Tools:**

1. Walk through Spare Part Master import.
2. Walk through Tool Master import with tool groups.
3. Trainee practises all remaining import types.

**End-of-Day Check:**
- Can trainee import all 5 master types independently? ✓

---

### Day 4 — Stock Upload & Company Master

**Goal:** Be able to upload opening stock and update company information.

**Morning (2.5 hours) — Stock Upload:**

1. Trainer explains what opening stock means and why it matters.
2. Walk through Item Stock Upload step by step.
3. Demonstrate warehouse and bin assignment in the grid.
4. Demonstrate the validation process and colour-coded rows.
5. Show what Reset means and emphasise its risks.
6. Trainee practises stock upload for Item and Spare Part.

**Afternoon (1.5 hours) — Company Master:**

1. Walk through the Company Master page.
2. Demonstrate editing a company detail field.
3. Demonstrate toggling a feature switch.
4. Trainee practises editing and saving company details.

**End-of-Day Check:**
- Can trainee complete stock upload end-to-end? ✓
- Can trainee update company master details? ✓

---

### Day 5 — Advanced Modules & Review

**Goal:** Understand module authority, content authority, and transaction delete.

**Morning (2 hours) — Module Authority & Content Authority:**

1. Walk through New Module Addition — show the grid, create a test module.
2. Walk through Module Authority — show how to toggle a module on/off.
3. Walk through Content Authority — explain the Synced/Inactive/Not Synced states.
4. Demonstrate searching, filtering, and saving content selection.

**Midday (1 hour) — ERP Transaction Delete:**

1. Explain why this module exists.
2. Walk through the Check Usage flow.
3. **Trainee observes only** — no actual deletion practice (too risky).
4. Explain the security steps (credentials, CAPTCHA, reason).

**Afternoon (1 hour) — Full Review:**

1. Trainee does a complete end-to-end run without trainer's help:
   - Login
   - Import a Ledger file
   - Import an Item file
   - Upload Item stock
   - View Content Authority
2. Trainer evaluates and notes any gaps.
3. Q&A session — trainee asks all outstanding questions.

**End-of-Training Certification:**

Trainee is certified ready for independent use when they can:
- [ ] Log in (both steps) independently.
- [ ] Import all 5 master data types without errors.
- [ ] Upload opening stock with warehouse/bin assignment.
- [ ] Toggle a module in Module Authority.
- [ ] Describe (not perform) the deletion process and its risks.

---

## 11. Best Practices

### 11.1 Before Uploading Any Excel File

- **Always download the template first** from the system. Never guess the column names.
- **Do not change column headers** in the template. The system reads them exactly as written.
- **Remove blank rows** from the bottom of your Excel file before uploading. Empty rows can cause confusion.
- **Remove special characters** from data fields (avoid characters like `"`, `'`, `<`, `>` in names unless they are genuinely part of the name).
- **Test with a small file first** (10–20 rows) before uploading hundreds of records. This lets you catch format errors cheaply.

### 11.2 During Import

- **Always click Preview before Import.** Never skip Preview — it is your only chance to see problems before data enters the database.
- **Wait for the success message** before closing the browser tab. For large files, the import can take 30–60 seconds.
- **Do not click Import multiple times.** Clicking twice can cause duplicate data. Wait for the response.
- **Do not use the browser back button** during import. It may cancel the operation mid-way.

### 11.3 Stock Upload Best Practices

- **Set up warehouses and bins before stock upload.** If they are not configured, the dropdowns will be empty.
- **Use the Validate button before Import.** A green validation result is your guarantee of clean data.
- **Filter to "Invalid" rows first** when fixing errors — address the most critical issues before the warnings.
- **Never use Reset without manager approval.** The 4-step security exists for a reason — treat it seriously.

### 11.4 Module Management Best Practices

- **Keep module Display Orders sequential.** Gaps in ordering (e.g., 1, 2, 5, 10) do not cause problems but make future reordering confusing.
- **Don't delete modules unless absolutely certain.** Disabling (deactivating) is almost always safer than deleting.
- **Test module changes in a staging environment first** if one is available before applying to production.

### 11.5 Content Authority Best Practices

- **Refresh before making changes** to see the most current data from both databases.
- **Use filters to focus your work** — filter to "Not Synced" to find content that needs to be added.
- **Save frequently** — don't leave 30+ unsaved changes on screen.
- **"Update Content Details" periodically** — if Indus Analytics updates specifications, run this to keep your data current.

### 11.6 Security Best Practices

- **Log out when you leave your workstation.** Your session grants access to the company database.
- **Do not share your login credentials** with anyone.
- **Use strong passwords** — minimum 8 characters with letters and numbers.
- **Be extremely cautious in ERP Transaction Delete.** If in doubt, do not delete. Consult your supervisor first.
- **The CAPTCHA in Transaction Delete exists to protect you** — if you cannot solve it calmly, stop and reconsider if you really want to proceed.

### 11.7 Common Mistakes to Avoid

| Mistake | Consequence | Prevention |
|---|---|---|
| Uploading wrong Excel file | Wrong data imported into the wrong module | Double-check the file name before uploading |
| Skipping Preview | Errors go into the database unnoticed | Always click Preview first |
| Clicking Import twice | Duplicate records created | Wait for the success message before any second action |
| Changing Excel headers | Import fails with "column not found" error | Never modify the template headers |
| Using browser back during import | Import cancels midway, partial data | Never use browser navigation during an active import |
| Forgetting to select financial year | Data saved to wrong year | Always confirm the financial year in Step 2 of login |
| Deleting modules actively used in ERP | Users lose access to features | Always check usage before deleting |

---

## Appendix A — Quick Reference Card

*(Print this card and keep it at your desk)*

### Login
1. Open https://bulkimport.vercel.app
2. Enter Company Code + Company Password → Click Login
3. Enter Your Username + Password + Select Year → Click Login

### Import Any Master Data
1. Click "Import Master" in sidebar
2. Select Module Name → Select Sub-Module (if shown)
3. Upload Excel file → Click Preview
4. Review Preview → Click Import
5. Wait for Success message

### Upload Stock
1. Click "Stock Upload" in sidebar
2. Select Module → Select Sub-Module
3. Upload Excel or Load Existing
4. Assign Warehouses & Bins
5. Validate → Import Stock

### Activate a Module
1. Click "Module Authority" in sidebar
2. Select Product → Click "Show Modules"
3. Check the module's checkbox
4. Click "Save Authority"

### Emergency Contact
> If you encounter an error you cannot resolve, note the error message, the time it occurred, and what you were doing — then contact your system administrator or Indus Analytics support.

---

*End of ExcelJet Standard Operating Procedure & Training Manual*  
*Version 1.0 — Prepared April 2026*  
*For updates or corrections to this document, contact the IT/Systems team.*
