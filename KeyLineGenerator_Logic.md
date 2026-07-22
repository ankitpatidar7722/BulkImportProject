# KeyLine Generator — Complete Logic Documentation

> **Purpose:** Ye document dusre project me KeyLine Generator feature implement karne ke liye likha gaya hai.  
> Dimension variables dalo → formulas evaluate hoti hain → SVG keyline draw hoti hai.

---

## 1. Core Concept (Simple Summary)

```
User types W=60, H=200, L=150, PF=40 ...
       ↓
DB se coordinate rows fetch hoti hain (formula strings jaise "PF+(L/5)")
       ↓
Har formula evaluate hoti hai dimension vars ke against → number milta hai (mm)
       ↓
SVG me <line> / <path> draw hoti hai un numbers se
       ↓
Keyline complete!
```

**Dimension change karo → SVG real-time update ho jata hai** — koi backend call nahi, sab client-side formula evaluation hai.

---

## 2. Database Tables

### Table 1: `ContentWiseKeylineContentName`
Box styles (product types) store karta hai.

| Column | Type | Description |
|--------|------|-------------|
| `ContentName` | NVARCHAR | Box style name e.g. "Reverse Tuck-In", "Straight Tuck-In" |

```sql
-- Fetch all box styles
SELECT DISTINCT ContentName FROM ContentWiseKeylineContentName
```

---

### Table 2: `ContentWiseKeylineCoordinates` ⭐ (Main Table)
Har line/curve ka formula yahan store hota hai.

| Column | Type | Description |
|--------|------|-------------|
| `CoordinateID` | INT IDENTITY PK | Auto increment |
| `ContentType` | NVARCHAR | Box style name (FK to ContentName) |
| `Grain` | NVARCHAR | `'With Grain'` ya `'Across Grain'` |
| `UpsType` | NVARCHAR | `'First Up'`, `'Even Up'`, `'Odd Up'`, `'Last Up'` |
| `ShapeType` | NVARCHAR | Panel label: `'LENGTH'`, `'WIDTH'`, `'OPEN FLAP'`, `'PASTING FLAP'`, `'DUST FLAP'`, `'TUCKIN WIDTH'`, `'BOTTOM FLAP'` |
| `ShapeName` | NVARCHAR | Logical group name (user-defined) |
| `LineType` | NVARCHAR | `'Solid'`, `'Curve'`, `'Circle'` |
| `LineStyles` | NVARCHAR | `'Solid'`, `'Dashed'` |
| `AddInX1` | NVARCHAR | **Formula string** for X1 coordinate e.g. `"PF+(L/5)"` |
| `AddInY1` | NVARCHAR | **Formula string** for Y1 coordinate e.g. `"0"` |
| `AddInX2` | NVARCHAR | **Formula string** for X2 coordinate e.g. `"PF+L"` |
| `AddInY2` | NVARCHAR | **Formula string** for Y2 coordinate e.g. `"OF"` |
| `AddInXForUps` | NVARCHAR | Formula for X offset when doing multi-ups e.g. `"W+W+L+L+PF"` |
| `AddInYForUps` | NVARCHAR | Formula for Y offset when doing multi-ups e.g. `"OF+W+H"` |
| `SheetSize` | NVARCHAR | `'Length'` ya `'Width'` (sheet planning ke liye) |

```sql
-- Fetch coordinates for a specific box style
SELECT CoordinateID, ShapeType, ShapeName, LineType, LineStyles,
       AddInX1, AddInY1, AddInX2, AddInY2,
       AddInXForUps, AddInYForUps, SheetSize
FROM ContentWiseKeylineCoordinates
WHERE ContentType = @ContentType
  AND Grain       = @Grain
  AND UpsType     = @UpsType
ORDER BY CoordinateID
```

---

### Table 3: `ContentWiseKeylineCoordinatesFormula`
Reusable formula strings ka library.

| Column | Type | Description |
|--------|------|-------------|
| `ID` | INT IDENTITY PK | |
| `Formula` | NVARCHAR | Formula string e.g. `"PF+(L/5)"` |

---

### Table 4: `ContentWiseKeylineSheetPlanning`
Sheet size calculation formulas.

| Column | Type | Description |
|--------|------|-------------|
| `FormulaID` | INT | |
| `ContentType` | NVARCHAR | Box style |
| `Grain` | NVARCHAR | With/Across Grain |
| `UpsType` | NVARCHAR | Ups type |
| `SheetSize` | NVARCHAR | Length/Width |
| `Formula` | NVARCHAR | Formula string |

---

## 3. Dimension Variables — Kya Matlab Hai

Ye 10 variables user input karta hai. **Sab mm me hain** (millimeters).

| Variable | Full Name | Physical Meaning |
|----------|-----------|-----------------|
| `W` | Width | Box ki width (mm) |
| `H` | Height | Box ki height (mm) |
| `L` | Length | Box ki length/depth (mm) |
| `PF` | Pasting Flap | Glue flap ki width |
| `OF` | Open Flap | Top tuck flap ki height |
| `BF` | Bottom Flap | Bottom crash-lock flap |
| `FH` | Flap Height | Legacy flap height |
| `TH` | Tongue Height | Lock tongue ki height |
| `xd` | X Offset | SVG canvas padding (left) — default `5` |
| `yd` | Y Offset | SVG canvas padding (top) — default `5` |

**Default values (starting point):**
```js
const vars = {
    W: 40, L: 60, H: 100,
    PF: 10, OF: 15, BF: 11.25,
    FH: 6.5, TH: 9,
    xd: 5, yd: 5
};
```

---

## 4. Formula Evaluation — The Heart of the System

### Formula Examples
```
"PF+(L/5)"        → 10 + (60/5)   = 22
"OF+W+H"          → 15 + 40 + 100 = 155
"PF+L+W+L+PF"    → 10+60+40+60+10 = 180
"0"               → 0
"(OF+W)/2"        → (15+40)/2     = 27.5
```

### Implementation — mathjs library use karo

```js
import { evaluate } from 'mathjs';

function evalFormula(expr, vars) {
    if (!expr) return null;
    try {
        const result = evaluate(expr, vars);  // vars = { W:60, H:200, L:150, ... }
        return typeof result === 'number' ? result : null;
    } catch {
        return null;  // invalid formula → line skip
    }
}
```

**`evaluate(expr, scope)`** → mathjs ka function hai. `scope` me variable names aur unki values dete hain.  
Error aaye to `null` return karo — us line ko simply mat draw karo.

### Alternative — Bina mathjs ke (Custom Evaluator)

Agar mathjs nahi use karna, toh **shunting-yard algorithm** se apna evaluator banao:

```
Input: "PF+(L/5)"  with vars={PF:10, L:60}

Step 1 — Tokenize:
  ["PF", "+", "(", "L", "/", "5", ")"]

Step 2 — Replace variables with values:
  [10, "+", "(", 60, "/", 5, ")"]

Step 3 — Shunting-yard → RPN:
  [10, 60, 5, "/", "+"]

Step 4 — Evaluate RPN stack:
  60/5=12 → 10+12=22 ✓
```

**Allowed operators:** `+ - * / ( )`  
**Allowed variables:** `W H L OF PF BF FH TH xd yd`  
**Longest-match rule:** "OF" ko match karo "O" se pehle

---

## 5. SVG Rendering Logic

### ViewBox
```
SVG viewBox = "0 0 400 400"   (main preview)
SVG viewBox = "0 0 800 800"   (fullscreen — scale=2)
```

### Coordinate Calculation (Har Row ke Liye)
```js
const x1 = xd + evalFormula(row.addInX1, vars);  // xd = canvas left offset
const y1 = yd + evalFormula(row.addInY1, vars);  // yd = canvas top offset
const x2 = xd + evalFormula(row.addInX2, vars);
const y2 = yd + evalFormula(row.addInY2, vars);
```

### Line Type Decision

```
if (ShapeType starts with "DIM") {
    → Blue dimension arrow line
    → <line> with arrowhead markers at both ends
    → stroke="#2563eb"
}
else if (LineType === "Circle") {
    → SVG Arc path
    → radius = distance(p1, p2) / 2
    → <path d="M x1 y1 A r r 0 1 1 x2 y2" />
}
else if (LineType === "Curve") {
    → Quadratic Bezier
    → Control point = (x2, y1)  ← NOTE: x2 se y1 tak jata hai
    → <path d="M x2 y2 Q x2 y1 x1 y1" />
                                ↑ Start/end intentionally swapped
}
else {  // "Solid" (default)
    → Straight line
    → <line x1 y1 x2 y2>
    → if (LineStyles === "Dashed"): strokeDasharray="2,2"
}
```

### Line Colors
```
Normal line     → stroke="#374151"  (dark gray)
Selected row    → stroke="#ef4444"  (red, rendered last = on top)
Dimension line  → stroke="#2563eb"  (blue)
```

### React SVG Component Structure
```jsx
function SvgPreview({ coordRows, vars }) {
    const xd = vars.xd ?? 5;
    const yd = vars.yd ?? 5;

    const normalRows = coordRows.filter(r => r._id !== selectedRowId);
    const highlighted = coordRows.find(r => r._id === selectedRowId);

    return (
        <svg viewBox="0 0 400 400" width="100%" style={{ background: 'white' }}>
            <defs>
                {/* arrowhead marker for DIM lines */}
                <marker id="arrow" ...>
                    <path d="M 0 0 L 10 5 L 0 10 z" />
                </marker>
            </defs>

            {/* Normal rows first */}
            {normalRows.map(row => renderRow(row, vars, xd, yd))}

            {/* Selected row on top (red) */}
            {highlighted && renderRow(highlighted, vars, xd, yd, true)}
        </svg>
    );
}
```

---

## 6. Complete Data Flow (End to End)

```
1. User opens page
        ↓
2. GET /api/keyline/content-names
   → ContentName list fetch
   → User selects "Reverse Tuck-In"
        ↓
3. User selects Grain = "With Grain", UpsType = "First Up"
        ↓
4. User clicks "Load Data"
   GET /api/keyline/coordinates?contentType=Reverse Tuck-In&grain=With Grain&upsType=First Up
   → Array of rows with formula strings:
     [
       { shapeType: "OPEN FLAP", lineType: "Curve",  addInX1: "PF+(L/5)", addInY1: "0",    addInX2: "PF+L", addInY2: "OF" },
       { shapeType: "LENGTH",    lineType: "Solid",  addInX1: "PF",       addInY1: "OF",   addInX2: "PF+L", addInY2: "OF" },
       { shapeType: "TUCKIN",    lineType: "Solid",  addInX1: "PF",       addInY1: "OF+W", addInX2: "PF+L", addInY2: "OF+W", lineStyles: "Dashed" },
       ...
     ]
        ↓
5. coordRows state me store
        ↓
6. SvgPreview render → evalFormula() each row → SVG draw
        ↓
7. User changes W = 60 → 80
        ↓
8. vars state update → SvgPreview re-render → new coordinates calculate → SVG update
   (No API call! Sab client-side)
        ↓
9. User edits formula in grid → row update → SVG update
        ↓
10. User clicks "Save Coordinates"
    POST /api/keyline/save-coordinates
    → Backend: DELETE old rows + INSERT new rows (transaction)
```

---

## 7. Save Coordinates — API Payload

```js
// POST /api/keyline/save-coordinates
{
    contentType: "Reverse Tuck-In",   // box style
    grain: "With Grain",
    upsType: "First Up",
    rows: [
        {
            shapeType: "LENGTH",
            shapeName: "OF LEFT",
            lineType: "Solid",
            lineStyles: "Solid",
            addInX1: "PF",
            addInY1: "OF",
            addInX2: "PF+L",
            addInY2: "OF",
            addInXForUps: "W+W+L+L+PF",
            addInYForUps: "OF+W+H",
            sheetSize: "Length"
        },
        // ... more rows
    ]
}
```

**Backend logic:**
```sql
-- Transaction me:
DELETE FROM ContentWiseKeylineCoordinates
WHERE ContentType = @ContentType AND Grain = @Grain AND UpsType = @UpsType;

-- Fir sab rows insert:
INSERT INTO ContentWiseKeylineCoordinates
(ContentType, Grain, UpsType, ShapeType, ShapeName, LineType, LineStyles,
 AddInX1, AddInY1, AddInX2, AddInY2, AddInXForUps, AddInYForUps, SheetSize)
VALUES (@ContentType, @Grain, @UpsType, ...)
```

---

## 8. "Across Grain" — Automatic Axis Swap

Across Grain coordinate manually enter nahi karte. **With Grain se automatically derive hoti hai** by swapping X↔Y:

```js
// With Grain row:
{ addInX1: "PF",   addInY1: "OF",  addInX2: "PF+L", addInY2: "OF+W" }

// Across Grain (auto-generated by swapping):
{ addInX1: "OF+W", addInY1: "PF+L", addInX2: "OF",  addInY2: "PF" }
//           ↑Y2 becomes X1   ↑X2 becomes Y1   ↑Y1 becomes X2  ↑X1 becomes Y2
```

**Swap formula:**
```js
acrossGrainRow = {
    addInX1: withGrainRow.addInY2,
    addInY1: withGrainRow.addInX2,
    addInX2: withGrainRow.addInY1,
    addInY2: withGrainRow.addInX1,
    addInXForUps: withGrainRow.addInYForUps,
    addInYForUps: withGrainRow.addInXForUps,
};
```

---

## 9. Multi-Ups Logic (Multiple Box Copies)

**UpsType** = ek sheet me kitne box copies:
- `First Up` — single copy (standard)
- `Even Up` — even number copies
- `Odd Up` — odd number copies
- `Last Up` — last copy in the row

Multi-ups ke liye `AddInXForUps` / `AddInYForUps` use hote hain:
```
First Up coordinates + (UpsOffset × AddInXForUps value)
```

Example: `AddInXForUps = "W+W+L+L+PF"` → har copy is offset se shift hoti hai.

---

## 10. Dusre Project Me Implement Karne ke Steps

### Step 1 — Database Setup
```sql
CREATE TABLE ContentWiseKeylineContentName (
    ID          INT IDENTITY(1,1) PRIMARY KEY,
    ContentName NVARCHAR(200) NOT NULL
);

CREATE TABLE ContentWiseKeylineCoordinates (
    CoordinateID    INT IDENTITY(1,1) PRIMARY KEY,
    ContentType     NVARCHAR(200) NOT NULL,
    Grain           NVARCHAR(50)  NOT NULL,  -- 'With Grain' / 'Across Grain'
    UpsType         NVARCHAR(50)  NOT NULL,  -- 'First Up' / 'Even Up' etc
    ShapeType       NVARCHAR(100),
    ShapeName       NVARCHAR(200),
    LineType        NVARCHAR(50),   -- 'Solid' / 'Curve' / 'Circle'
    LineStyles      NVARCHAR(50),   -- 'Solid' / 'Dashed'
    AddInX1         NVARCHAR(500),  -- formula string
    AddInY1         NVARCHAR(500),
    AddInX2         NVARCHAR(500),
    AddInY2         NVARCHAR(500),
    AddInXForUps    NVARCHAR(500),
    AddInYForUps    NVARCHAR(500),
    SheetSize       NVARCHAR(50)
);
```

### Step 2 — Backend API (Minimum Required)
```
GET  /api/keyline/content-names           → list of box styles
GET  /api/keyline/coordinates?contentType=&grain=&upsType=  → rows with formulas
POST /api/keyline/save-coordinates        → save rows
```

### Step 3 — Frontend Dependencies
```bash
npm install mathjs
```

### Step 4 — Core Files to Copy/Adapt
```
KeyLineGenerator.tsx  → Main page + SvgPreview component
keyline3D.ts          → 3D fold logic (optional, sirf agar 3D preview chahiye)
Box3DViewer.tsx        → Three.js 3D viewer (optional)
```

### Step 5 — Minimum Viable Implementation

```tsx
import { evaluate } from 'mathjs';

// 1. Variables state
const [vars, setVars] = useState({ W:60, H:200, L:150, PF:40, OF:30, BF:0, FH:0, TH:0, xd:5, yd:5 });

// 2. Rows from DB
const [rows, setRows] = useState([]);

// 3. Formula evaluator
const evalF = (expr, vars) => {
    try { return evaluate(expr, vars); }
    catch { return null; }
};

// 4. SVG
function KeylineSVG({ rows, vars }) {
    return (
        <svg viewBox="0 0 400 400" style={{ border: '1px solid #ccc' }}>
            {rows.map((row, i) => {
                const x1 = vars.xd + evalF(row.addInX1, vars);
                const y1 = vars.yd + evalF(row.addInY1, vars);
                const x2 = vars.xd + evalF(row.addInX2, vars);
                const y2 = vars.yd + evalF(row.addInY2, vars);
                if ([x1,y1,x2,y2].some(v => v == null || isNaN(v))) return null;

                if (row.lineType === 'Curve') {
                    return <path key={i} d={`M ${x2} ${y2} Q ${x2} ${y1} ${x1} ${y1}`}
                        fill="none" stroke="#374151" strokeWidth="0.5" />;
                }
                if (row.lineType === 'Circle') {
                    const r = Math.hypot(x2-x1, y2-y1) / 2;
                    return <path key={i} d={`M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`}
                        fill="none" stroke="#374151" strokeWidth="0.5" />;
                }
                // Solid line (default)
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#374151" strokeWidth="0.5"
                    strokeDasharray={row.lineStyles === 'Dashed' ? '2,2' : undefined} />;
            })}
        </svg>
    );
}
```

---

## 11. ShapeType → Panel Meaning

| ShapeType | Box Panel |
|-----------|-----------|
| `LENGTH` | Side wall (L dimension) |
| `WIDTH` | Front/back wall (W dimension) |
| `OPEN FLAP` | Top tuck-in flap |
| `PASTING FLAP` | Glue/pasting flap |
| `DUST FLAP` | Side closure flaps |
| `TUCKIN WIDTH` | Lock tongue |
| `BOTTOM FLAP` | Bottom closure |
| `HEIGHT` | Vertical panel |
| `DIM_*` | Dimension annotation lines (blue arrows) |

---

## 12. Key Files in This Project

| File | Purpose |
|------|---------|
| `Frontend/src/pages/KeyLineGenerator.tsx` | Main page, SvgPreview, UI |
| `Frontend/src/lib/keyline3D.ts` | 3D geometry, formula evaluator (custom), panel detection |
| `Frontend/src/components/Box3DViewer.tsx` | Three.js 3D fold animation |
| `Frontend/src/services/api.ts` | All keyline API calls (lines 2493–2615) |
| `Backend/Controllers/KeylineController.cs` | REST endpoints |
| `Backend/Services/KeylineService.cs` | Dapper SQL queries |
| `Backend/DTOs/KeylineDto.cs` | DTO classes |

---

*Document generated: 2026-07-17*
