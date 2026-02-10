# SalesRepresentative Complex Query - Updated! ✅

## Kya Change Kiya

### Pehle (Simple Query):
```sql
-- Old Logic ❌:
SELECT LedgerName 
FROM LedgerMaster 
WHERE LedgerID = @RefSalesRepresentativeID 
AND LedgerGroupID = 3
```

### Ab (Complex Query):
```sql
-- New Logic ✅:
SELECT LedgerID, LedgerName 
FROM LedgerMaster 
WHERE ISNULL(IsDeletedTransaction,0) <> 1
AND LedgerGroupID IN (
    SELECT DISTINCT LedgerGroupID 
    FROM LedgerGroupMaster 
    WHERE CompanyID = 2 
    AND LedgerGroupNameID = 27
)
AND LedgerID IN (
    SELECT DISTINCT LedgerID 
    FROM LedgerMasterDetails 
    WHERE CompanyID = 2 
    AND FieldName = 'Designation' 
    AND FieldValue = 'JOB COORDINATOR' 
    AND IsDeletedTransaction = 0
)
```

---

## Query Breakdown

### Step 1: LedgerGroupMaster Check
```sql
LedgerGroupID IN (
    SELECT DISTINCT LedgerGroupID 
    FROM LedgerGroupMaster 
    WHERE CompanyID = 2 
    AND LedgerGroupNameID = 27
)
```
**Purpose:** Sirf un LedgerGroups se employees lao jo CompanyID=2 aur LedgerGroupNameID=27 me hai.

### Step 2: Designation Check
```sql
LedgerID IN (
    SELECT DISTINCT LedgerID 
    FROM LedgerMasterDetails 
    WHERE CompanyID = 2 
    AND FieldName = 'Designation' 
    AND FieldValue = 'JOB COORDINATOR' 
    AND IsDeletedTransaction = 0
)
```
**Purpose:** Sirf wo ledgers lao jinki designation "JOB COORDINATOR" hai.

### Step 3: Not Deleted Check
```sql
WHERE ISNULL(IsDeletedTransaction,0) <> 1
```
**Purpose:** Deleted records ko exclude karo.

---

## Full Implementation

### 1. Load Data Query (GET)

```csharp
LEFT JOIN (
    SELECT LedgerID, LedgerName 
    FROM LedgerMaster 
    WHERE ISNULL(IsDeletedTransaction,0) <> 1
    AND LedgerGroupID IN (
        SELECT DISTINCT LedgerGroupID 
        FROM LedgerGroupMaster 
        WHERE CompanyID = 2 AND LedgerGroupNameID = 27
    )
    AND LedgerID IN (
        SELECT DISTINCT LedgerID 
        FROM LedgerMasterDetails 
        WHERE CompanyID = 2 
        AND FieldName = 'Designation' 
        AND FieldValue = 'JOB COORDINATOR' 
        AND IsDeletedTransaction = 0
    )
) sr ON l.RefSalesRepresentativeID = sr.LedgerID
```

**Effect:**
- `l.RefSalesRepresentativeID` me ID hai
- Join karke `sr.LedgerName` mil jayega
- UI me naam show hoga ✅

### 2. Import Data Lookup (POST)

```csharp
int? salesRepId = await _connection.ExecuteScalarAsync<int?>(
    @"SELECT LedgerID 
      FROM LedgerMaster 
      WHERE LedgerName = @Name 
      AND ISNULL(IsDeletedTransaction,0) <> 1
      AND LedgerGroupID IN (
          SELECT DISTINCT LedgerGroupID 
          FROM LedgerGroupMaster 
          WHERE CompanyID = 2 AND LedgerGroupNameID = 27
      )
      AND LedgerID IN (
          SELECT DISTINCT LedgerID 
          FROM LedgerMasterDetails 
          WHERE CompanyID = 2 
          AND FieldName = 'Designation' 
          AND FieldValue = 'JOB COORDINATOR' 
          AND IsDeletedTransaction = 0
      )",
    new { Name = ledger.SalesRepresentative }
);
```

**Effect:**
- Excel me "John Sharma" naam aata hai
- Ye query uska LedgerID find karti hai
- Wo ID `RefSalesRepresentativeID` me save hoti hai ✅

---

## Tables Involved

### 1. LedgerMaster
```
Columns:
- LedgerID (PK)
- LedgerName
- LedgerGroupID (FK)
- RefSalesRepresentativeID (FK to LedgerID)
- IsDeletedTransaction
```

### 2. LedgerGroupMaster
```
Columns:
- LedgerGroupID (PK)
- LedgerGroupName
- LedgerGroupNameID
- CompanyID
```

### 3. LedgerMasterDetails
```
Columns:
- LedgerID (FK)
- FieldName (e.g., "Designation")
- FieldValue (e.g., "JOB COORDINATOR")
- CompanyID
- IsDeletedTransaction
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ LOAD DATA (GET)                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Fetch Clients from LedgerMaster                     │
│     WHERE LedgerGroupID = 1 (Clients)                   │
│                                                          │
│  2. For each Client:                                     │
│     - Get RefSalesRepresentativeID (e.g., 123)          │
│                                                          │
│  3. LEFT JOIN to get Employee Name:                     │
│     - Find LedgerID = 123 in LedgerMaster               │
│     - Check: LedgerGroupID IN (...LedgerGroupNameID=27) │
│     - Check: Designation = 'JOB COORDINATOR'            │
│     - Return: LedgerName (e.g., "John Sharma")          │
│                                                          │
│  4. Display on UI: "John Sharma" ✅                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ IMPORT DATA (POST)                                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Excel Input: SalesRepresentative = "John Sharma"    │
│                                                          │
│  2. Lookup LedgerID:                                     │
│     - Find LedgerName = "John Sharma"                   │
│     - Check: LedgerGroupID IN (...LedgerGroupNameID=27) │
│     - Check: Designation = 'JOB COORDINATOR'            │
│     - Return: LedgerID = 123                            │
│                                                          │
│  3. Insert into LedgerMaster:                            │
│     - RefSalesRepresentativeID = 123 ✅                 │
│                                                          │
│  4. Success! Data saved correctly.                       │
└─────────────────────────────────────────────────────────┘
```

---

## Example Scenario

### Database State:

**LedgerGroupMaster:**
```
LedgerGroupID | LedgerGroupNameID | CompanyID
-------------|-------------------|----------
5            | 27                | 2         ← Employee Group
```

**LedgerMaster (Employees):**
```
LedgerID | LedgerGroupID | LedgerName   | RefSalesRepresentativeID
---------|---------------|--------------|-------------------------
123      | 5             | John Sharma  | NULL
456      | 5             | Priya Mehta  | NULL
```

**LedgerMasterDetails:**
```
LedgerID | FieldName    | FieldValue       | CompanyID
---------|--------------|------------------|----------
123      | Designation  | JOB COORDINATOR  | 2        ✅
456      | Designation  | MANAGER          | 2        ❌ (Not JOB COORDINATOR)
```

**LedgerMaster (Clients):**
```
LedgerID | LedgerGroupID | LedgerName | RefSalesRepresentativeID
---------|---------------|------------|-------------------------
789      | 1             | ABC Corp   | 123                      ← Points to John
890      | 1             | XYZ Ltd    | 456                      ← Points to Priya
```

### Query Results:

#### Load Data:
```
Client: ABC Corp
RefSalesRepresentativeID: 123
→ Lookup John Sharma (LedgerID=123)
→ Check Designation: JOB COORDINATOR ✅
→ Display: "John Sharma" ✅

Client: XYZ Ltd
RefSalesRepresentativeID: 456
→ Lookup Priya Mehta (LedgerID=456)
→ Check Designation: MANAGER ❌
→ Display: "" (NULL) ❌
```

**Why Priya Mehta not shown?**
Because her designation is "MANAGER", not "JOB COORDINATOR"!

---

## Configuration Values

| Parameter         | Value            | Purpose                           |
|-------------------|------------------|-----------------------------------|
| CompanyID         | 2                | Filter by company                 |
| LedgerGroupNameID | 27               | Employee group identifier         |
| FieldName         | 'Designation'    | Custom field in LedgerMasterDetails |
| FieldValue        | 'JOB COORDINATOR'| Only Job Coordinators allowed      |

---

## Testing Steps

### 1. Check Available Employees
```sql
-- Run this to see who qualifies as Sales Representative
SELECT LedgerID AS EmployeeID, LedgerName AS EmployeeName 
FROM LedgerMaster 
WHERE ISNULL(IsDeletedTransaction,0) <> 1
AND LedgerGroupID IN (
    SELECT DISTINCT LedgerGroupID 
    FROM LedgerGroupMaster 
    WHERE CompanyID = 2 AND LedgerGroupNameID = 27
)
AND LedgerID IN (
    SELECT DISTINCT LedgerID 
    FROM LedgerMasterDetails 
    WHERE CompanyID = 2 
    AND FieldName = 'Designation' 
    AND FieldValue = 'JOB COORDINATOR' 
    AND IsDeletedTransaction = 0
)
ORDER BY LedgerName
```

### 2. Test Load Data
```
1. Start backend: dotnet run
2. Start frontend: npm run dev
3. Go to: Import Master → Ledger Master → Clients
4. Click "Load Data"
5. Check: SalesRepresentative column shows JOB COORDINATOR names only ✅
```

### 3. Test Import
```
Excel file (Clients.xlsx):
LedgerName | SalesRepresentative
ABC Corp   | John Sharma

1. Upload file
2. Import
3. Check database:
   SELECT RefSalesRepresentativeID FROM LedgerMaster WHERE LedgerName='ABC Corp'
   → Should return John Sharma's LedgerID ✅
```

---

## Important Notes

### ⚠️ Only JOB COORDINATORS
Sirf wo employees show honge jinki designation "JOB COORDINATOR" hai LedgerMasterDetails me.

### ⚠️ Company Specific
Sirf CompanyID=2 ke employees show honge.

### ⚠️ Not Deleted
Deleted employees show nahi honge.

### ⚠️ Case Sensitivity
- "JOB COORDINATOR" exact match chahiye
- "Job Coordinator" ❌ (Wrong case)
- "JOB COORDINATOR" ✅ (Correct)

---

## Modified Files

### Backend:
✅ `LedgerService.cs`
   - Line 43-60: Updated SELECT query with complex JOIN
   - Line 206-225: Updated import lookup query

---

## Status: ✅ UPDATED!

Ab sirf JOB COORDINATOR designation wale employees hi Sales Representative me dikhenge!

Backend restart karne ke baad kaam karega! 🎉
