# ✅ Country & State Dropdowns Implemented

## 🎯 Objective
Replace free-text inputs for "Country" and "State" in the Excel preview grid with **Dropdowns**, where the State dropdown is filtered based on the selected Country.

## 🔧 Backend Changes
1. **New DTO**: Created `CountryStateDto` to transfer Country/State pairs.
2. **Service Update**: Added `GetCountryStatesAsync` to `LedgerService` to fetch distinct pairs from `CountryStateMaster`.
3. **API Endpoint**: Added `GET /api/ledger/country-states` to expose this data.

## 💻 Frontend Changes
1. **Data Fetching**: The grid component now fetches the Country/State master list on load.
2. **Smart Rendering**:
   - The "Country" column now renders a `<select>` with unique countries.
   - The "State" column now renders a `<select>` populated dynamically based on the row's selected Country.
3. **Cascading Logic**: Changing a Country automatically resets the State for that row to ensure validity.
4. **Styling**: Dropdowns maintain the transparent, seamless grid aesthetic.

## 🚀 How to Test
1. **Reload Page**: `Ctrl + Shift + R`
2. **Load Data**: Import an Excel file or load existing data.
3. **Edit Country**: Click a Country cell. You should see a dropdown. Change it.
   - Observe that the State cell in that row clears/resets.
4. **Edit State**: Click the State cell. You should see only states valid for the selected Country.
5. **Validation**: Run validation to confirm the data is accepted.
