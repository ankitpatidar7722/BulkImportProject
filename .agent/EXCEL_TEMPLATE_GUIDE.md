# Sample Excel Template for Ledger Master Import

## Filename Convention
The Excel filename MUST match the Ledger Group name exactly.

**Examples:**
- Ledger Group: "Clients" → File: **Clients.xlsx**
- Ledger Group: "Suppliers" → File: **Suppliers.xlsx**
- Ledger Group: "Consignee" → File: **Consignee.xlsx**

---

## Excel Structure

### Sheet Name
Can be any name (usually "Sheet1" or "Ledger Data")

### Column Headers (First Row)
The following column headers should be in the first row. Order doesn't matter.

**Required Columns** (must not be empty):
- LedgerName
- Address1
- Country
- State

**Optional Columns**:
- MailingName
- Address2
- Address3
- City
- Pincode
- TelephoneNo
- Email
- MobileNo
- Website
- PANNo
- GSTNo
- SalesRepresentative
- SupplyTypeCode
- GSTApplicable
- DeliveredQtyTolerance
- RefCode
- GSTRegistrationType
- CreditDays

---

## Sample Data

### Example 1: Minimal Required Data
| LedgerName | Address1 | Country | State |
|-----------|----------|---------|-------|
| ABC Corporation | 123 Main Street | India | Maharashtra |
| XYZ Industries | 456 Park Avenue | India | Delhi |

### Example 2: Complete Data
| LedgerName | MailingName | Address1 | Address2 | Address3 | Country | State | City | Pincode | TelephoneNo | Email | MobileNo | Website | PANNo | GSTNo | SalesRepresentative | SupplyTypeCode | GSTApplicable | DeliveredQtyTolerance | RefCode | GSTRegistrationType | CreditDays |
|-----------|------------|----------|----------|----------|---------|-------|------|---------|------------|-------|----------|---------|-------|-------|---------------------|----------------|---------------|---------------------|---------|---------------------|------------|
| ABC Corp | ABC Industries Pvt Ltd | 123 Street | Building A | Floor 5 | India | Maharashtra | Mumbai | 400001 | 022-12345678 | abc@corp.com | 9876543210 | www.abccorp.com | ABCPD1234E | 27ABCDE1234F1Z5 | John Sharma | B2B | TRUE | 5.5 | ABC001 | Regular | 30 |
| XYZ Ltd | XYZ Company | 456 Road | Sector 15 | | India | Delhi | New Delhi | 110001 | 011-98765432 | contact@xyz.com | 9123456789 | www.xyzltd.com | XYZPD5678F | 07XYZAB5678G2H6 | Priya Mehta | B2C | TRUE | 10 | XYZ002 | Composition | 45 |

---

## Field Guidelines

### LedgerName
- **Type:** Text
- **Required:** YES
- **Max Length:** 200 characters
- **Example:** "ABC Corporation", "XYZ Industries Pvt Ltd"

### MailingName
- **Type:** Text
- **Required:** NO
- **Max Length:** 200 characters
- **Example:** "ABC Industries Pvt Ltd"

### Address1
- **Type:** Text
- **Required:** YES
- **Max Length:** 500 characters
- **Example:** "123 Main Street, Building A"

### Address2, Address3
- **Type:** Text
- **Required:** NO
- **Max Length:** 500 characters each
- **Example:** "Sector 15, Near Metro Station"

### Country
- **Type:** Text
- **Required:** YES
- **Must Match:** CountryStateMaster table
- **Case Sensitive:** NO (India = india = INDIA)
- **Example:** "India", "United States", "United Kingdom"

### State
- **Type:** Text
- **Required:** YES
- **Must Match:** CountryStateMaster table (with Country)
- **Case Sensitive:** NO
- **Example:** "Maharashtra", "Delhi", "Tamil Nadu"

### City
- **Type:** Text
- **Required:** NO
- **Example:** "Mumbai", "New Delhi", "Bangalore"

### Pincode
- **Type:** Text (can contain letters for international)
- **Required:** NO
- **Example:** "400001", "110001", "560001"

### TelephoneNo
- **Type:** Text
- **Required:** NO
- **Format:** Any (with or without country code, dashes, spaces)
- **Example:** "022-12345678", "+91 22 1234 5678", "02212345678"

### Email
- **Type:** Email
- **Required:** NO
- **Example:** "contact@company.com"

### MobileNo
- **Type:** Text
- **Required:** NO
- **Format:** Any
- **Example:** "9876543210", "+91-9876543210"

### Website
- **Type:** URL
- **Required:** NO
- **Example:** "www.company.com", "https://company.com"

### PANNo
- **Type:** Text
- **Required:** NO
- **Format:** Usually AAAAA9999A (India PAN)
- **Example:** "ABCDE1234F"

### GSTNo
- **Type:** Text
- **Required:** NO
- **Format:** Usually 15 characters (India GST)
- **Example:** "27ABCDE1234F1Z5"
- **Note:** Used for duplicate detection (LedgerName + Address1 + GSTNo)

### SalesRepresentative
- **Type:** Text
- **Required:** NO
- **Example:** "John Sharma", "Priya Mehta"

### SupplyTypeCode
- **Type:** Text
- **Required:** NO
- **Example:** "B2B", "B2C", "Export"

### GSTApplicable
- **Type:** Boolean
- **Required:** NO
- **Values:** TRUE, FALSE, 1, 0, true, false
- **Example:** "TRUE" or "1" for yes, "FALSE" or "0" for no

### DeliveredQtyTolerance
- **Type:** Decimal/Number
- **Required:** NO
- **Example:** 5, 10.5, 15.75

### RefCode
- **Type:** Text
- **Required:** NO
- **Example:** "ABC001", "XYZ002"

### GSTRegistrationType
- **Type:** Text
- **Required:** NO
- **Example:** "Regular", "Composition", "Unregistered"

### CreditDays
- **Type:** Number (Integer)
- **Required:** NO
- **Example:** 30, 45, 60, 90

---

## Validation Rules

### 1. Duplicate Check (Results in RED row)
Combination of these 3 fields must be unique:
- LedgerName
- Address1
- GSTNo

**Example of Duplicate:**
```
Row 1: LedgerName="ABC Corp", Address1="123 Street", GSTNo="GST123"
Row 2: LedgerName="ABC Corp", Address1="123 Street", GSTNo="GST123"
^^ This will be marked as duplicate (RED)
```

### 2. Missing Data Check (Results in BLUE cell)
These fields CANNOT be empty:
- LedgerName
- Address1
- Country
- State

**Example:**
```
Row 1: LedgerName="ABC", Address1="", Country="India", State="Maharashtra"
                           ^^ This cell will be BLUE
```

### 3. Country/State Mismatch (Results in ORANGE row)
Country and State combination must exist in CountryStateMaster table.

**Valid Examples (if in master table):**
- Country="India", State="Maharashtra" ✅
- Country="India", State="Delhi" ✅
- Country="United States", State="California" ✅

**Invalid Examples:**
- Country="India", State="New York" ❌ (Wrong country for state)
- Country="Indiaaa", State="Maharashtra" ❌ (Typo in country name)

---

## Tips for Success

### ✅ DO:
1. **Match filename exactly** to Ledger Group name
2. **Fill all required fields** (LedgerName, Address1, Country, State)
3. **Use correct Country/State** names from your master data
4. **Avoid duplicates** (same LedgerName + Address1 + GSTNo)
5. **Use TRUE/FALSE or 1/0** for GSTApplicable
6. **Keep data clean** (no extra spaces, special characters unless needed)

### ❌ DON'T:
1. **Don't use wrong filename** (must match group name)
2. **Don't leave required fields empty**
3. **Don't use invalid Country/State combinations**
4. **Don't create duplicate records**
5. **Don't mix data types** (numbers in text fields usually OK, but avoid text in number fields)
6. **Don't use formulas** in Excel cells (use values only)

---

## How to Create the Template

### Option 1: Manual Creation
1. Open Excel
2. Create column headers in first row (see above)
3. Add your data starting from row 2
4. Save as `.xlsx` format
5. Rename file to match Ledger Group name

### Option 2: Export Existing Data
1. Go to Import Master
2. Select Ledger Master → Your Group
3. Click "Load Data"
4. Click "Export"
5. Modify the downloaded file
6. Re-import with changes

---

## Common Country/State Combinations (India)

| Country | State |
|---------|-------|
| India | Andhra Pradesh |
| India | Arunachal Pradesh |
| India | Assam |
| India | Bihar |
| India | Chhattisgarh |
| India | Goa |
| India | Gujarat |
| India | Haryana |
| India | Himachal Pradesh |
| India | Jharkhand |
| India | Karnataka |
| India | Kerala |
| India | Madhya Pradesh |
| India | Maharashtra |
| India | Manipur |
| India | Meghalaya |
| India | Mizoram |
| India | Nagaland |
| India | Odisha |
| India | Punjab |
| India | Rajasthan |
| India | Sikkim |
| India | Tamil Nadu |
| India | Telangana |
| India | Tripura |
| India | Uttar Pradesh |
| India | Uttarakhand |
| India | West Bengal |
| India | Delhi |

**Note:** Check your CountryStateMaster table for the exact list available in your system.

---

## Sample Excel Files

### File: Clients.xlsx (Minimal)
```
LedgerName        | Address1          | Country | State
------------------|-------------------|---------|-------------
Tech Solutions    | 101 Tech Park     | India   | Maharashtra
Global Traders    | 202 Business Hub  | India   | Delhi
Innovative Inc    | 303 IT Center     | India   | Karnataka
```

### File: Suppliers.xlsx (Complete)
```
LedgerName | MailingName | Address1 | Country | State | City | PANNo | GSTNo | CreditDays
-----------|-------------|----------|---------|-------|------|-------|-------|------------
Paper Co   | Paper Supply| 555 Mill St | India | Tamil Nadu | Chennai | PAPER1234A | 33PAPER1234A1Z5 | 30
Ink Makers | Ink & Colors| 666 Color Ave | India | Gujarat | Ahmedabad | INKMA5678B | 24INKMA5678B2Y6 | 45
```

---

## Troubleshooting Import Issues

### Error: "Please correct your Excel file name..."
**Cause:** Filename doesn't match Ledger Group name
**Solution:** Rename file exactly as shown in error message

### Validation: RED rows (Duplicates)
**Cause:** Same LedgerName + Address1 + GSTNo combination
**Solution:** Change one of these fields to make it unique

### Validation: BLUE cells (Missing Data)
**Cause:** Required field is empty
**Solution:** Fill in LedgerName, Address1, Country, or State

### Validation: ORANGE rows (Mismatch)
**Cause:** Country/State not in CountryStateMaster
**Solution:** Check spelling, use exact names from master table

### Import Fails
**Cause:** Validation errors still exist
**Solution:** Fix all RED, BLUE, ORANGE errors and re-validate

---

## Need Help?

1. **Load existing data** first using "Load Data" button
2. **Export it** to see the correct format
3. **Modify** the exported file with your new data
4. **Re-import** the modified file

This way you'll always have the correct format! 📊✨
