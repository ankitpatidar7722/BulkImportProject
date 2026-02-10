# Excel Validation Color Coding System

## Overview
Fixed the validation color coding system for the Excel preview feature to properly highlight data validation issues.

## Color Coding Legend

### 🔴 RED - Duplicate Data Rows
- **Applied to**: Entire row background
- **Visual Style**: Light red background with a thick red left border
- **Trigger**: When a row is identified as a duplicate based on:
  - Matching `LedgerName`
  - Matching `Address1`
  - Matching `GSTNo`
- **Check**: Against both existing database records AND other rows in the same Excel file

### 🔵 BLUE - Missing Required Data
- **Applied to**: Individual cells/input fields
- **Visual Style**: Blue background on the specific input field
- **Trigger**: When required fields are empty or null
- **Required Fields**:
  - LedgerName
  - Address1
  - Country
  - State

### 🟡 YELLOW - Mismatched Data
- **Applied to**: Individual cells/input fields
- **Visual Style**: Yellow background on the specific input field
- **Trigger**: When data doesn't match reference tables
- **Currently checks**:
  - Invalid Country/State combinations (validated against `CountryStateMaster` table)
  - Both Country and State cells are highlighted when the combination is invalid

## Implementation Details

### Backend Changes (LedgerService.cs)
1. **Fixed Summary Counting**: Changed from counting individual cell validations to counting unique rows with issues
2. **Separate Column Validations**: Added individual cell validations for both `Country` and `State` columns (instead of combined "Country/State")
3. **Proper Priority**: Duplicate > MissingData > Mismatch

### Frontend Changes (LedgerMasterEnhanced.tsx)
1. **Enhanced Row Coloring**: Duplicate rows now have a more visible red background with a thick left border
2. **Input Field Coloring**: Added `getInputBgColor()` function that directly applies validation colors to input fields
3. **Cell Background**: Blue (200) for missing data, Yellow (200) for mismatch
4. **Border Emphasis**: Validation colors also affect the border color for better visibility

## Validation Flow
1. **Upload Excel** → Preview shows editable grid
2. **Click "Check Validation"** → Backend validates all rows and returns status
3. **Color Highlighting**:
   - Red rows = Duplicates (cannot import)
   - Blue cells = Missing required data (cannot import)
   - Yellow cells = Data mismatch (cannot import)
4. **Edit Data** → Users can directly edit cells in the preview
5. **Re-Run Validation** → Check again after edits
6. **Import** → Only allowed when all validations pass (isValid = true)

## Validation Summary Panel
The summary shows:
- **Total Rows**: All rows in the Excel file
- **Valid Rows**: Rows with no issues (green)
- **Duplicate Data**: Count of duplicate rows (red)
- **Missing Data**: Count of rows with missing required fields (blue)
- **Mismatch Data**: Count of rows with invalid data (yellow)

## Testing
To test the color coding:
1. **Duplicate Test**: Upload an Excel with duplicate entries
2. **Missing Data Test**: Leave required fields empty
3. **Mismatch Test**: Enter invalid Country/State combinations (e.g., "India" + "California")
