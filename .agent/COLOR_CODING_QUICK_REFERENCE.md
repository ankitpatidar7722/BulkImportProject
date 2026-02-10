# 🎨 Color Coding Quick Reference

## ✅ Correct Workflow (Shows Colors)

```
1. Import Master Page
2. Select "Ledger Master" module  
3. Select a Ledger Group
4. Find LedgerMasterEnhanced section below
5. Click "Import From Excel"
6. Choose your .xlsx file
7. Click "Check Validation" ← Colors appear here!
```

## 🎨 Color Legend

| Color | Meaning | Applied To | Fix |
|-------|---------|------------|-----|
| 🔴 **RED Row** | Duplicate record | Entire row | Remove duplicate or update key fields |
| 🔵 **BLUE Cell** | Missing required data | Input field | Fill in the required value |
| 🟡 **YELLOW Cell** | Invalid data | Input field | Fix the Country/State combination |

## 📊 Required Fields (Cannot be empty)

- ✅ LedgerName
- ✅ Address1  
- ✅ Country
- ✅ State

## 🐛 Quick Debug

**Colors not showing?**

1. **Check**: Are you in LedgerMasterEnhanced component?
   - Look for buttons: "Load Data", "Import From Excel", "Check Validation"
   - If you only see "Preview" and "Import", you're in wrong component!

2. **Check**: Did you click "Check Validation"?
   - Colors only appear AFTER validation runs

3. **Check**: Open Browser Console (F12)
   - Enable debug: Set `DEBUG_MODE = true` in LedgerMasterEnhanced.tsx
   - Look for `[VALIDATION]` and `[COLOR]` logs

## 🔧 Enable Debug Logging

**File**: `Frontend/src/components/LedgerMasterEnhanced.tsx`

```typescript
// Line 22 - Change from false to true
const DEBUG_MODE = true;  // ← Change this
```

Then check browser console for:
- `[VALIDATION] Starting validation...`
- `[COLOR] Row X status: Duplicate`
- `[INPUT BG] Applying BLUE for missing data`

## 📁 Key Files

| File | Purpose |
|------|---------|
| `Backend/Services/LedgerService.cs` | Validation logic |
| `Frontend/src/components/LedgerMasterEnhanced.tsx` | Color implementation |
| `.agent/COLOR_CODING_FIX_SUMMARY.md` | Complete documentation |
| `.agent/COLOR_CODING_DEBUG_GUIDE.md` | Detailed debugging |

## 🎯 Test Data Examples

**Test Duplicates (RED)**:
```
Same LedgerName + Address1 + GSTNo = Duplicate
```

**Test Missing Data (BLUE)**:
```
Leave LedgerName empty
Leave Address1 empty
Leave Country empty  
Leave State empty
```

**Test Mismatch (YELLOW)**:
```
Country: "India", State: "California"  ← Invalid!
Country: "USA", State: "Maharashtra"   ← Invalid!
```

## 🚫 Common Mistakes

❌ Using generic "Preview" button → No colors  
✅ Using "Import From Excel" in LedgerMasterEnhanced → Has colors

❌ Not clicking "Check Validation" → No colors  
✅ Clicking "Check Validation" → Colors appear

❌ Viewing in wrong component → No colors  
✅ Viewing in LedgerMasterEnhanced → Has colors
