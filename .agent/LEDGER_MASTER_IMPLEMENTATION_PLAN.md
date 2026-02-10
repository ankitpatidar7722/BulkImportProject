# Ledger Master Import Enhancement - Implementation Plan

## Overview
Enhanced Import Master functionality for Ledger Master with database load, Excel import, validation, and soft delete features.

## Requirements Summary

### 1. UI Changes
- **Buttons when Ledger Master + Ledger Group selected:**
  - Load Data
  - Remove Row
  - Import From Excel
  
### 2. Load Data Feature
- Load data from database for selected Ledger Group (where IsDeletedTransaction = 0)
- Display in Excel-like editable grid
- Show Export button after loading
- **Columns:** LedgerName, MailingName, Address1, Address2, Address3, Country, State, City, Pincode, TelephoneNo, Email, MobileNo, Website, PANNo, GSTNo, SalesRepresentative, SupplyTypeCode, GSTApplicable, DeliveredQtyTolerance, RefCode, GSTRegistrationType, CreditDays

### 3. Remove Row (Soft Delete)
- Select row and click Remove Row
- Set IsDeletedTransaction = 1 (not physical delete)

### 4. Import From Excel
- Upload Excel file
- Validate filename matches Ledger Group name (e.g., "Clients.xlsx")
- Show error if name mismatch
- After upload show: Preview and Check Validation buttons

### 5. Preview
- Display Excel data in editable grid (cell-wise editing)

### 6. Check Validation
- **Duplicate Check:** LedgerName + Address1 + GSTNo (color row RED)
- **Missing Data:** Empty required columns (color cell BLUE)
- **Mismatch Data:** Country/State vs CountryStateMaster table (case-insensitive match)
- **Validation Summary:** Show counts - Duplicate Data: X, Missing Data: Y, Mismatch Data: Z
- Only allow save when all validations pass

## Implementation Steps

### Backend (C# .NET)

#### 1. Create DTOs
- [x] LedgerMasterDto.cs
- [ ] LedgerValidationResultDto.cs

#### 2. Create/Update Services
- [ ] LedgerService.cs
  - GetLedgersByGroupAsync(ledgerGroupId)
  - SoftDeleteLedgerAsync(ledgerId)
  - ValidateLedgersAsync(ledgerData)
  - ImportLedgersAsync(validatedData)

#### 3. Create/Update Controllers
- [ ] LedgerController.cs
  - GET /api/ledger/bygroup/{ledgerGroupId}
  - DELETE /api/ledger/soft-delete/{ledgerId}
  - POST /api/ledger/validate
  - POST /api/ledger/import

#### 4. Database Queries
- [ ] Get Ledger data with IsDeletedTransaction filter
- [ ] Update IsDeletedTransaction flag
- [ ] Check for duplicates
- [ ] Validate Country/State against CountryStateMaster

### Frontend (React TypeScript)

#### 1. Update ImportMaster.tsx
- [ ] Add conditional button rendering (Load Data, Remove Row, Import From Excel)
- [ ] Implement file upload with filename validation
- [ ] Add Preview and Check Validation buttons
- [ ] Create editable grid component (Excel-like)
- [ ] Add color-coding for validation (RED for duplicates, BLUE for missing)
- [ ] Display validation summary
- [ ] Export to Excel functionality

#### 2. Create Components
- [ ] EditableDataGrid.tsx (Excel-like grid with cell editing)
- [ ] ValidationSummary.tsx
- [ ] FileUploadWithValidation.tsx

#### 3. Update API Services
- [ ] Add ledger API endpoints in api.ts

## Database Schema Requirements

### LedgerMaster Table (Expected columns)
- LedgerId (PK)
- LedgerGroupID (FK)
- LedgerName
- MailingName
- Address1, Address2, Address3
- Country, State, City, Pincode
- TelephoneNo, Email, MobileNo, Website
- PANNo, GSTNo
- SalesRepresentative
- SupplyTypeCode
- GSTApplicable
- DeliveredQtyTolerance
- RefCode
- GSTRegistrationType
- CreditDays
- IsDeletedTransaction (BIT)

### CountryStateMaster Table
- Country
- State

## Validation Logic

### 1. Duplicate Check
```
Group by: LedgerName + Address1 + GSTNo
If count > 1: Mark as duplicate
Color: RED
```

### 2. Missing Data Check
```
Required fields: LedgerName, Address1, State, Country
If any is empty: Mark cell
Color: BLUE
```

### 3. Mismatch Check
```
Compare Country/State with CountryStateMaster (case-insensitive)
If not found: Mark as mismatch
Color: ORANGE/YELLOW
```

## UI Flow

1. User selects "Ledger Master" → Sub-module dropdown shows "Clients", etc.
2. User selects "Clients" → Show buttons: Load Data, Remove Row, Import From Excel
3. **Load Data Path:**
   - Click → Fetch from DB → Show grid + Export button
4. **Import Path:**
   - Click Import → Upload file → Validate filename
   - If valid → Show Preview + Check Validation buttons
   - Click Preview → Show editable grid
   - Click Check Validation → Run validation → Show colored rows/cells + summary
   - If all pass → Enable Save button

## Testing Checklist
- [ ] Load data shows only non-deleted records
- [ ] Remove row sets IsDeletedTransaction = 1
- [ ] Filename validation works correctly
- [ ] Duplicate detection works
- [ ] Missing data detection works
- [ ] Country/State mismatch detection works (case-insensitive)
- [ ] Validation summary displays correctly
- [ ] Grid is fully editable
- [ ] Export to Excel works
- [ ] Import saves validated data correctly

## Notes
- All validation should happen before saving
- Soft delete only (never physical delete)
- Case-insensitive matching for Country/State
- Excel filename must exactly match Ledger Group name
