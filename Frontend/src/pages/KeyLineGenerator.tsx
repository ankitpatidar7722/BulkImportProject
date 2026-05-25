import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { evaluate } from 'mathjs';
import {
    Save, Trash2, Plus, RefreshCw, Download, ZoomIn, ZoomOut,
    Upload, ChevronDown, RotateCcw, Layers, FileText, Move, Maximize2, X
} from 'lucide-react';
import {
    KeylineCoordinateDto, KeylineFormulaDto, KeylinePlanningDto,
    keylineGetContentNames, keylineGetMeta, keylineGetCoordinates,
    keylineGetShapeWiseData, keylineGetFormulas,
    keylineSaveCoordinates, keylineSaveFormula, keylineDeleteFormula,
    keylineDeleteCoordinates, keylineGetPlanning, keylineSavePlanning,
    keylineDeletePlanning
} from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GridRow extends KeylineCoordinateDto {
    _id: string;
}

interface PlanningRow extends KeylinePlanningDto {
    _id: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2);

const evalFormula = (expr: string | undefined, vars: Record<string, number>): number | null => {
    if (!expr) return null;
    try {
        const result = evaluate(expr, vars);
        return typeof result === 'number' ? result : null;
    } catch {
        return null;
    }
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GRAIN_OPTIONS = ['With Grain', 'Across Grain'];
const UPS_OPTIONS = ['First Up', 'Even Up', 'Odd Up', 'Last Up'];
const SHEET_SIZE_OPTIONS = ['Length', 'Width'];
const LINE_TYPE_OPTIONS = ['Solid', 'Curve', 'Circle'];
const LINE_STYLE_OPTIONS = ['Solid', 'Dashed'];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SelectProps {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({ value, onChange, options, placeholder, className = '', disabled }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

    const close = useCallback(() => { setOpen(false); setSearch(''); }, []);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) close();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, close]);

    const handleSelect = (v: string) => { onChange(v); close(); };

    return (
        <div className={`relative ${className}`} ref={ref}>
            <button
                type="button"
                onClick={() => { if (!disabled) setOpen(o => !o); }}
                disabled={disabled}
                className="w-full flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
                <span className={value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 truncate'}>
                    {value || placeholder || 'Select...'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 ml-1 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden">
                    {/* Search input */}
                    <div className="p-1.5 border-b border-gray-100 dark:border-gray-700">
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="w-full text-sm px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    {/* Options list */}
                    <div className="max-h-52 overflow-y-auto">
                        {filtered.length > 0 ? filtered.map(o => (
                            <button
                                key={o}
                                type="button"
                                onClick={() => handleSelect(o)}
                                className={`w-full text-left text-sm px-3 py-2 transition-colors
                                    ${value === o
                                        ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {o}
                            </button>
                        )) : (
                            <div className="text-sm text-gray-400 dark:text-gray-500 px-3 py-3 text-center">No options found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

interface LabelInputProps {
    label: string;
    value: string;
    onChange?: (v: string) => void;
    readOnly?: boolean;
    type?: string;
    placeholder?: string;
}

const LabelInput: React.FC<LabelInputProps> = ({ label, value, onChange, readOnly, placeholder }) => (
    <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
        <input
            type="text"
            value={value}
            onChange={e => onChange?.(e.target.value)}
            readOnly={readOnly}
            placeholder={placeholder}
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 read-only:bg-gray-50 dark:read-only:bg-gray-700"
        />
    </div>
);

// ─── SVG Preview ─────────────────────────────────────────────────────────────

interface SvgPreviewProps {
    rows: GridRow[];
    vars: Record<string, number>;
    zoom: number;
    highlightedId: string | null;
}

const SvgPreview: React.FC<SvgPreviewProps> = ({ rows, vars, zoom, highlightedId }) => {
    const svgSize = 400;

    const renderShape = (row: GridRow, idx: number) => {
        const x1 = evalFormula(row.addInX1, vars);
        const y1 = evalFormula(row.addInY1, vars);
        const x2 = evalFormula(row.addInX2, vars);
        const y2 = evalFormula(row.addInY2, vars);
        if (x1 === null || y1 === null || x2 === null || y2 === null) return null;

        const xd = vars.xd ?? 5;
        const yd = vars.yd ?? 5;
        const rx1 = xd + x1, ry1 = yd + y1, rx2 = xd + x2, ry2 = yd + y2;
        const isHighlighted = row._id === highlightedId;
        const isDashed = row.lineStyles === 'Dashed';

        const strokeProps = isHighlighted
            ? { stroke: '#ef4444', strokeWidth: 1.5 }
            : { stroke: '#1e3a5f', strokeWidth: 0.5, ...(isDashed ? { strokeDasharray: '2,2' } : {}) };

        if (row.lineType === 'Circle') {
            const r = Math.sqrt(Math.pow(rx2 - rx1, 2) + Math.pow(ry2 - ry1, 2)) / 2;
            return <path key={idx} d={`M ${rx1} ${ry1} A ${r} ${r} 0 1 1 ${rx2} ${ry2}`} fill="none" {...strokeProps} />;
        }
        if (row.lineType === 'Curve') {
            // Legacy logic: drawCurveNSolid(x2, x1, y2, y1) — Y1/Y2 are intentionally swapped
            return <path key={idx} d={`M ${rx2} ${ry2} Q ${rx2} ${ry1} ${rx1} ${ry1}`} fill="none" {...strokeProps} />;
        }
        return <line key={idx} x1={rx1} y1={ry1} x2={rx2} y2={ry2} {...strokeProps} />;
    };

    // Render normal rows first, then highlighted on top so it's always visible
    const normalRows = rows.filter(r => r._id !== highlightedId);
    const highlightedRow = rows.find(r => r._id === highlightedId);

    return (
        <div className="w-full h-full overflow-auto bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <svg
                width={svgSize * zoom}
                height={svgSize * zoom}
                viewBox={`0 0 ${svgSize} ${svgSize}`}
                style={{ display: 'block' }}
            >
                <rect width={svgSize} height={svgSize} fill="white" />
                <g>{normalRows.map((r, i) => renderShape(r, i))}</g>
                {highlightedRow && <g>{renderShape(highlightedRow, 9999)}</g>}
            </svg>
        </div>
    );
};

// ─── Fullscreen SVG Preview (larger canvas, crisp lines) ─────────────────────

const FullscreenSvgPreview: React.FC<SvgPreviewProps> = ({ rows, vars, zoom, highlightedId }) => {
    const svgSize = 800;

    const renderShape = (row: GridRow, idx: number) => {
        const x1 = evalFormula(row.addInX1, vars);
        const y1 = evalFormula(row.addInY1, vars);
        const x2 = evalFormula(row.addInX2, vars);
        const y2 = evalFormula(row.addInY2, vars);
        if (x1 === null || y1 === null || x2 === null || y2 === null) return null;

        // Scale up 2× for fullscreen clarity
        const scale = 2;
        const xd = (vars.xd ?? 5) * scale;
        const yd = (vars.yd ?? 5) * scale;
        const rx1 = xd + x1 * scale, ry1 = yd + y1 * scale;
        const rx2 = xd + x2 * scale, ry2 = yd + y2 * scale;

        const isHighlighted = row._id === highlightedId;
        const isDashed = row.lineStyles === 'Dashed';
        const strokeProps = isHighlighted
            ? { stroke: '#ef4444', strokeWidth: 2.5 }
            : { stroke: '#1e3a5f', strokeWidth: 0.8, ...(isDashed ? { strokeDasharray: '4,3' } : {}) };

        if (row.lineType === 'Circle') {
            const r = Math.sqrt(Math.pow(rx2 - rx1, 2) + Math.pow(ry2 - ry1, 2)) / 2;
            return <path key={idx} d={`M ${rx1} ${ry1} A ${r} ${r} 0 1 1 ${rx2} ${ry2}`} fill="none" {...strokeProps} />;
        }
        if (row.lineType === 'Curve') {
            return <path key={idx} d={`M ${rx2} ${ry2} Q ${rx2} ${ry1} ${rx1} ${ry1}`} fill="none" {...strokeProps} />;
        }
        return <line key={idx} x1={rx1} y1={ry1} x2={rx2} y2={ry2} {...strokeProps} />;
    };

    const normalRows = rows.filter(r => r._id !== highlightedId);
    const highlightedRow = rows.find(r => r._id === highlightedId);

    return (
        <svg
            id="kl-svg-fullscreen"
            width={svgSize * zoom}
            height={svgSize * zoom}
            viewBox={`0 0 ${svgSize} ${svgSize}`}
            style={{ display: 'block', background: 'white', borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}
        >
            <rect width={svgSize} height={svgSize} fill="white" />
            <g>{normalRows.map((r, i) => renderShape(r, i))}</g>
            {highlightedRow && <g>{renderShape(highlightedRow, 9999)}</g>}
        </svg>
    );
};

// ─── 3D Box Preview ──────────────────────────────────────────────────────────

const Box3DPreview: React.FC<{ vars: Record<string, number> }> = ({ vars }) => {
    const [rotX, setRotX] = useState(-22);
    const [rotY, setRotY] = useState(30);
    const [autoRotate, setAutoRotate] = useState(true);
    // 0 = fully open, 1 = fully closed
    const [openAmount, setOpenAmount] = useState(0);
    const animRef = useRef<number>(0);
    const dragRef = useRef<{ sx: number; sy: number; rx: number; ry: number } | null>(null);

    const rawW = Math.max(10, vars.W ?? 100);
    const rawL = Math.max(10, vars.L ?? 80);
    const rawH = Math.max(10, vars.H ?? 120);

    // Scale: longest dimension = 300px
    const s = 300 / Math.max(rawW, rawL, rawH);
    const bW = rawW * s;
    const bD = rawL * s;
    const bH = rawH * s;
    // Main tuck flaps (front & back) are taller; side dust flaps are shorter
    const tuckFlapH = Math.max(28, Math.min(bH * 0.25, 75));
    const dustFlapH = Math.max(18, Math.min(tuckFlapH * 0.58, 44));

    // Flap angles driven by slider: open (0) → -118deg; closed (1) → 0deg
    const mainFlapAngle = -118 * (1 - openAmount);
    const dustFlapAngle = -95 * (1 - openAmount);
    const topBg = `rgba(96,165,250,${(openAmount * 0.30).toFixed(2)})`;

    // Auto-rotate Y axis
    useEffect(() => {
        if (!autoRotate) { cancelAnimationFrame(animRef.current); return; }
        let y = rotY;
        const step = () => { y += 0.28; setRotY(y); animRef.current = requestAnimationFrame(step); };
        animRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(animRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoRotate]);

    // Drag-to-rotate
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragRef.current) return;
            setRotY(dragRef.current.ry + (e.clientX - dragRef.current.sx) * 0.5);
            setRotX(dragRef.current.rx - (e.clientY - dragRef.current.sy) * 0.5);
        };
        const onUp = () => { dragRef.current = null; };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    }, []);

    const faceStyle = (w: number, h: number, transform: string, bg: string): React.CSSProperties => ({
        position: 'absolute', width: w, height: h,
        marginLeft: -w / 2, marginTop: -h / 2,
        transform, background: bg,
        border: '1.5px solid rgba(30,58,95,0.5)',
        backfaceVisibility: 'hidden',
    });

    // Main tuck flap (front & back) — full width, taller
    const tuckFlapPivot = (faceTransform: string) => (
        <div style={{
            position: 'absolute',
            width: bW, height: 0,
            marginLeft: -bW / 2,
            marginTop: -bH / 2,
            transform: faceTransform,
            transformStyle: 'preserve-3d',
        }}>
            <div style={{
                position: 'absolute',
                width: bW, height: tuckFlapH,
                top: -tuckFlapH, left: 0,
                background: 'rgba(96,165,250,0.85)',
                border: '1.5px solid rgba(30,58,95,0.55)',
                transform: `rotateX(${mainFlapAngle}deg)`,
                transformOrigin: '50% 100%',
                transition: 'transform 0.45s ease-out',
                backfaceVisibility: 'hidden',
            }} />
        </div>
    );

    // Side dust flap (left & right) — full depth, shorter
    const dustFlapPivot = (faceTransform: string) => (
        <div style={{
            position: 'absolute',
            width: bD, height: 0,
            marginLeft: -bD / 2,
            marginTop: -bH / 2,
            transform: faceTransform,
            transformStyle: 'preserve-3d',
        }}>
            <div style={{
                position: 'absolute',
                width: bD, height: dustFlapH,
                top: -dustFlapH, left: 0,
                background: 'rgba(147,197,253,0.82)',
                border: '1.5px solid rgba(30,58,95,0.55)',
                transform: `rotateX(${dustFlapAngle}deg)`,
                transformOrigin: '50% 100%',
                transition: 'transform 0.45s ease-out',
                backfaceVisibility: 'hidden',
            }} />
        </div>
    );

    return (
        <div className="flex flex-col h-full">

            {/* ── 3D Viewport ────────────────────────────────────────────── */}
            <div
                className="flex-1 relative"
                style={{ perspective: 1100, cursor: 'grab', overflow: 'hidden' }}
                onMouseDown={(e) => { setAutoRotate(false); dragRef.current = { sx: e.clientX, sy: e.clientY, rx: rotX, ry: rotY }; }}
            >
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: 0, height: 0,
                    transformStyle: 'preserve-3d',
                    transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
                }}>
                    {/* 4 side walls */}
                    <div style={faceStyle(bW, bH, `translateZ(${bD / 2}px)`,                  'rgba(219,234,254,0.90)')} />
                    <div style={faceStyle(bW, bH, `rotateY(180deg) translateZ(${bD / 2}px)`,  'rgba(191,219,254,0.88)')} />
                    <div style={faceStyle(bD, bH, `rotateY(90deg) translateZ(${bW / 2}px)`,   'rgba(147,197,253,0.88)')} />
                    <div style={faceStyle(bD, bH, `rotateY(-90deg) translateZ(${bW / 2}px)`,  'rgba(147,197,253,0.88)')} />

                    {/* Bottom (always closed) */}
                    <div style={faceStyle(bW, bD, `rotateX(-90deg) translateZ(${bH / 2}px)`,  'rgba(30,58,95,0.22)')} />

                    {/* Top face: transparent when open, tinted when closed */}
                    <div style={{ ...faceStyle(bW, bD, `rotateX(90deg) translateZ(${bH / 2}px)`, topBg), transition: 'background 0.3s' }} />

                    {/* Inner floor visible when open */}
                    {openAmount < 0.85 && (
                        <div style={faceStyle(bW * 0.9, bD * 0.9, `rotateX(90deg) translateZ(${bH / 2 - 4}px)`, 'rgba(30,58,95,0.07)')} />
                    )}

                    {/* Front & Back: main tuck flaps (full W, taller) */}
                    {tuckFlapPivot(`translateZ(${bD / 2}px)`)}
                    {tuckFlapPivot(`rotateY(180deg) translateZ(${bD / 2}px)`)}

                    {/* Left & Right: dust flaps (full D, shorter) */}
                    {dustFlapPivot(`rotateY(90deg) translateZ(${bW / 2}px)`)}
                    {dustFlapPivot(`rotateY(-90deg) translateZ(${bW / 2}px)`)}
                </div>
            </div>

            {/* ── Controls bar ────────────────────────────────────────────── */}
            <div className="shrink-0 flex flex-col items-center gap-3 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                {/* Dimension pills */}
                <div className="flex gap-3 text-xs font-medium">
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">W = {rawW} mm</span>
                    <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">L = {rawL} mm</span>
                    <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">H = {rawH} mm</span>
                </div>

                {/* Open ←→ Close slider */}
                <div className="flex items-center gap-3 w-full max-w-xs px-2">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 w-10 text-right shrink-0">Open</span>
                    <input
                        type="range"
                        min={0} max={1} step={0.01}
                        value={openAmount}
                        onChange={e => setOpenAmount(Number(e.target.value))}
                        className="flex-1 h-2 rounded-full accent-blue-600 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-10 shrink-0">Close</span>
                </div>

                {/* Rotate / Reset buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setAutoRotate(a => !a)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        {autoRotate ? '⏸ Pause' : '▶ Auto Rotate'}
                    </button>
                    <button
                        onClick={() => { setRotX(-22); setRotY(30); }}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        ↺ Reset
                    </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Drag to rotate manually</p>
            </div>
        </div>
    );
};

// ─── Cell Input with always-visible suggestions ───────────────────────────────

const CellInputWithSuggestions: React.FC<{
    value: string;
    onChange: (v: string) => void;
    suggestions: string[];
}> = ({ value, onChange, suggestions }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <input
                value={value}
                onChange={e => onChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
                className="w-full text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            {open && suggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 mt-0.5 w-full min-w-max bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-44 overflow-y-auto">
                    {suggestions.map(s => (
                        <button
                            key={s}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); }}
                            className={`w-full text-left text-xs px-2.5 py-1.5 transition-colors
                                ${value === s
                                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Editable Coordinate Grid ─────────────────────────────────────────────────

interface CoordGridProps {
    rows: GridRow[];
    onChange: (rows: GridRow[]) => void;
    formulaX1: string[];
    formulaY1: string[];
    formulaX2: string[];
    formulaY2: string[];
    shapeNames: string[];
    highlightedId: string | null;
    onHighlight: (id: string | null) => void;
    onRefreshDraw: () => void;
    onSaveAcrossGrain: () => void;
}

// Column definitions for resizable grid
const COORD_COLUMNS = [
    { key: 'shapeType',  label: 'Shape Type',  defaultW: 90  },
    { key: 'shapeName',  label: 'Shape Name',  defaultW: 120 },
    { key: 'lineType',   label: 'Line Type',   defaultW: 90  },
    { key: 'addInX1',    label: 'Add In X1',   defaultW: 130 },
    { key: 'addInY1',    label: 'Add In Y1',   defaultW: 130 },
    { key: 'addInX2',    label: 'Add In X2',   defaultW: 130 },
    { key: 'addInY2',    label: 'Add In Y2',   defaultW: 130 },
    { key: 'lineStyles', label: 'Line Style',  defaultW: 90  },
    { key: 'sheetSize',  label: 'Sheet Size',  defaultW: 90  },
];

const CoordGrid: React.FC<CoordGridProps> = ({
    rows, onChange, formulaX1, formulaY1, formulaX2, formulaY2,
    shapeNames, highlightedId, onHighlight, onRefreshDraw, onSaveAcrossGrain
}) => {
    const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
    const [dragIdx, setDragIdx] = useState<number | null>(null);

    // ── Column resize state ──────────────────────────────────────────────────
    const [colWidths, setColWidths] = useState<number[]>(COORD_COLUMNS.map(c => c.defaultW));
    const resizeRef = useRef<{ colIdx: number; startX: number; startW: number } | null>(null);

    const startResize = (colIdx: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        resizeRef.current = { colIdx, startX: e.clientX, startW: colWidths[colIdx] };
    };

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!resizeRef.current) return;
            const { colIdx, startX, startW } = resizeRef.current;
            const newW = Math.max(50, startW + (e.clientX - startX));
            setColWidths(prev => prev.map((w, i) => i === colIdx ? newW : w));
        };
        const onUp = () => { resizeRef.current = null; };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
    }, []);

    const updateRow = (id: string, field: keyof GridRow, value: string) => {
        onChange(rows.map(r => r._id === id ? { ...r, [field]: value } : r));
    };

    // Collect unique non-empty values already typed in each column → feed as suggestions
    const typedShapeTypes = useMemo(() =>
        [...new Set(rows.map(r => r.shapeType?.trim()).filter(Boolean) as string[])],
        [rows]
    );
    const typedShapeNames = useMemo(() =>
        [...new Set([...shapeNames, ...rows.map(r => r.shapeName?.trim()).filter(Boolean) as string[]])],
        [rows, shapeNames]
    );
    const typedX1 = useMemo(() =>
        [...new Set([...formulaX1, ...rows.map(r => r.addInX1?.trim()).filter(Boolean) as string[]])],
        [rows, formulaX1]
    );
    const typedY1 = useMemo(() =>
        [...new Set([...formulaY1, ...rows.map(r => r.addInY1?.trim()).filter(Boolean) as string[]])],
        [rows, formulaY1]
    );
    const typedX2 = useMemo(() =>
        [...new Set([...formulaX2, ...rows.map(r => r.addInX2?.trim()).filter(Boolean) as string[]])],
        [rows, formulaX2]
    );
    const typedY2 = useMemo(() =>
        [...new Set([...formulaY2, ...rows.map(r => r.addInY2?.trim()).filter(Boolean) as string[]])],
        [rows, formulaY2]
    );

    const addRow = () => {
        const newRow: GridRow = { _id: uid(), lineType: 'Solid', lineStyles: 'Solid' };
        onChange([...rows, newRow]);
    };

    const deleteChecked = () => {
        if (checkedIds.size === 0) { alert('Koi row select nahi hai.'); return; }
        if (!confirm(`${checkedIds.size} row(s) delete karein?`)) return;
        onChange(rows.filter(r => !checkedIds.has(r._id)));
        if (highlightedId && checkedIds.has(highlightedId)) onHighlight(null);
        setCheckedIds(new Set());
    };

    const toggleCheck = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const wasChecked = checkedIds.has(id);
        setCheckedIds(prev => {
            const next = new Set(prev);
            wasChecked ? next.delete(id) : next.add(id);
            return next;
        });
        // Checkbox check → highlight in SVG; uncheck → remove highlight if it was this row
        onHighlight(wasChecked ? (highlightedId === id ? null : highlightedId) : id);
    };

    const toggleAll = () => {
        if (checkedIds.size === rows.length) {
            setCheckedIds(new Set());
        } else {
            setCheckedIds(new Set(rows.map(r => r._id)));
        }
    };

    const allChecked = rows.length > 0 && checkedIds.size === rows.length;
    const someChecked = checkedIds.size > 0 && checkedIds.size < rows.length;

    // Drag-to-reorder
    const handleDragStart = (idx: number) => setDragIdx(idx);
    const handleDrop = (toIdx: number) => {
        if (dragIdx === null || dragIdx === toIdx) return;
        const arr = [...rows];
        const [moved] = arr.splice(dragIdx, 1);
        arr.splice(toIdx, 0, moved);
        onChange(arr);
        setDragIdx(null);
    };

    const cellInput = (id: string, field: keyof GridRow, suggestions: string[]) => {
        const row = rows.find(r => r._id === id);
        const val = (row?.[field] as string) ?? '';
        return (
            <td className="px-1 py-0.5" onClick={e => e.stopPropagation()}>
                <CellInputWithSuggestions
                    value={val}
                    onChange={v => updateRow(id, field, v)}
                    suggestions={suggestions}
                />
            </td>
        );
    };

    const cellSelect = (id: string, field: keyof GridRow, options: string[]) => {
        const row = rows.find(r => r._id === id);
        const val = (row?.[field] as string) ?? '';
        return (
            <td className="px-1 py-0.5" onClick={e => e.stopPropagation()}>
                <select
                    value={val}
                    onChange={e => updateRow(id, field, e.target.value)}
                    className="w-full text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                    <option value="">--</option>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            </td>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-2 mb-2">
                <button onClick={onRefreshDraw} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh Draw
                </button>
                <button onClick={onSaveAcrossGrain} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                    <Save className="w-3.5 h-3.5" /> Save Across Grain
                </button>
                <div className="flex-1" />
                {checkedIds.size > 0 && (
                    <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        {checkedIds.size} selected
                    </span>
                )}
                <button onClick={addRow} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
                <button onClick={deleteChecked} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="text-xs border-collapse" style={{ tableLayout: 'fixed', width: `${32 + 24 + colWidths.reduce((a, b) => a + b, 0) + 24}px` }}>
                    <thead>
                        <tr className="bg-[#0F294D] text-white sticky top-0 z-10">
                            {/* Select-all checkbox */}
                            <th className="px-2 py-2 text-center" style={{ width: 32 }}>
                                <input
                                    type="checkbox"
                                    checked={allChecked}
                                    ref={el => { if (el) el.indeterminate = someChecked; }}
                                    onChange={toggleAll}
                                    className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                                />
                            </th>
                            <th className="px-2 py-2 text-center" style={{ width: 24 }}>#</th>
                            {COORD_COLUMNS.map((col, i) => (
                                <th
                                    key={col.key}
                                    className="px-2 py-2 text-left select-none"
                                    style={{ width: colWidths[i], position: 'relative', overflow: 'hidden' }}
                                >
                                    <span className="truncate block pr-2">{col.label}</span>
                                    <div
                                        onMouseDown={(e) => startResize(i, e)}
                                        style={{
                                            position: 'absolute', right: 0, top: 0,
                                            width: 5, height: '100%',
                                            cursor: 'col-resize',
                                            background: 'rgba(255,255,255,0.15)',
                                            userSelect: 'none',
                                        }}
                                    />
                                </th>
                            ))}
                            <th className="px-2 py-2" style={{ width: 24 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const isHighlighted = row._id === highlightedId;
                            const isChecked = checkedIds.has(row._id);
                            return (
                                <tr
                                    key={row._id}
                                    draggable
                                    onDragStart={() => handleDragStart(idx)}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={() => handleDrop(idx)}
                                    onClick={() => onHighlight(isHighlighted ? null : row._id)}
                                    className={`cursor-pointer border-b border-gray-100 dark:border-gray-700 transition-colors
                                        ${isHighlighted
                                            ? 'bg-red-50 dark:bg-red-900/20 ring-1 ring-inset ring-red-300 dark:ring-red-700'
                                            : isChecked
                                                ? 'bg-blue-50 dark:bg-blue-900/30'
                                                : idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'
                                        } hover:bg-red-50 dark:hover:bg-red-900/10`}
                                >
                                    {/* Checkbox */}
                                    <td className="px-2 py-0.5 text-center" onClick={e => toggleCheck(row._id, e)}>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => { }}
                                            className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-2 py-0.5 text-center text-gray-400 font-mono">{idx + 1}</td>
                                    {cellInput(row._id, 'shapeType', typedShapeTypes)}
                                    {cellInput(row._id, 'shapeName', typedShapeNames)}
                                    {cellSelect(row._id, 'lineType', LINE_TYPE_OPTIONS)}
                                    {cellInput(row._id, 'addInX1', typedX1)}
                                    {cellInput(row._id, 'addInY1', typedY1)}
                                    {cellInput(row._id, 'addInX2', typedX2)}
                                    {cellInput(row._id, 'addInY2', typedY2)}
                                    {cellSelect(row._id, 'lineStyles', LINE_STYLE_OPTIONS)}
                                    {cellSelect(row._id, 'sheetSize', SHEET_SIZE_OPTIONS)}
                                    <td className="px-1">
                                        <Move className="w-3 h-3 text-gray-300 cursor-grab" />
                                    </td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={12} className="py-10 text-center text-gray-400 text-sm">
                                    No rows — upload an SVG or load from database
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ─── Planning Grid ─────────────────────────────────────────────────────────────

interface PlanningGridProps {
    rows: PlanningRow[];
    onChange: (rows: PlanningRow[]) => void;
}

const PlanningGrid: React.FC<PlanningGridProps> = ({ rows, onChange }) => {
    const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

    const updateRow = (id: string, field: keyof PlanningRow, value: string) => {
        onChange(rows.map(r => r._id === id ? { ...r, [field]: value } : r));
    };

    const toggleCheck = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setCheckedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (checkedIds.size === rows.length) {
            setCheckedIds(new Set());
        } else {
            setCheckedIds(new Set(rows.map(r => r._id)));
        }
    };

    const deleteChecked = () => {
        if (checkedIds.size === 0) { alert('Koi row select nahi hai.'); return; }
        if (!confirm(`${checkedIds.size} row(s) delete karein?`)) return;
        onChange(rows.filter(r => !checkedIds.has(r._id)));
        setCheckedIds(new Set());
    };

    const allChecked = rows.length > 0 && checkedIds.size === rows.length;
    const someChecked = checkedIds.size > 0 && checkedIds.size < rows.length;

    const cell = (id: string, field: keyof PlanningRow, options?: string[]) => {
        const row = rows.find(r => r._id === id);
        const val = (row?.[field] as string) ?? '';
        if (options) return (
            <td className="px-1 py-0.5" onClick={e => e.stopPropagation()}>
                <select value={val} onChange={e => updateRow(id, field, e.target.value)}
                    className="w-full text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:outline-none">
                    <option value="">--</option>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            </td>
        );
        return (
            <td className="px-1 py-0.5" onClick={e => e.stopPropagation()}>
                <input value={val} onChange={e => updateRow(id, field, e.target.value)}
                    className="w-full text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
            </td>
        );
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-end gap-3">
                {checkedIds.size > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {checkedIds.size} selected
                    </span>
                )}
                <button onClick={deleteChecked} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                </button>
            </div>
            <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="bg-[#0F294D] text-white">
                            <th className="px-2 py-2 w-8 text-center">
                                <input
                                    type="checkbox"
                                    checked={allChecked}
                                    ref={el => { if (el) el.indeterminate = someChecked; }}
                                    onChange={toggleAll}
                                    className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                                />
                            </th>
                            <th className="px-3 py-2 text-left">Content Type</th>
                            <th className="px-3 py-2 text-left">Grain</th>
                            <th className="px-3 py-2 text-left">Ups Type</th>
                            <th className="px-3 py-2 text-left">Sheet Size</th>
                            <th className="px-3 py-2 text-left">Formula</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const isChecked = checkedIds.has(row._id);
                            return (
                                <tr key={row._id}
                                    onClick={() => {
                                        setCheckedIds(prev => {
                                            const next = new Set(prev);
                                            next.has(row._id) ? next.delete(row._id) : next.add(row._id);
                                            return next;
                                        });
                                    }}
                                    className={`cursor-pointer border-b border-gray-100 dark:border-gray-700 transition-colors
                                        ${isChecked
                                            ? 'bg-blue-50 dark:bg-blue-900/30'
                                            : idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'
                                        } hover:bg-blue-50 dark:hover:bg-blue-900/20`}>
                                    <td className="px-2 py-0.5 text-center" onClick={e => toggleCheck(row._id, e)}>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => { }}
                                            className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                                        />
                                    </td>
                                    {cell(row._id, 'contentType')}
                                    {cell(row._id, 'grain', GRAIN_OPTIONS)}
                                    {cell(row._id, 'upsType', UPS_OPTIONS)}
                                    {cell(row._id, 'sheetSize', SHEET_SIZE_OPTIONS)}
                                    {cell(row._id, 'formula')}
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr><td colSpan={6} className="py-6 text-center text-gray-400 text-sm">No planning data</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const KeyLineGenerator: React.FC = () => {
    // Filter state
    const [contentType, setContentType] = useState('');
    const [grain, setGrain] = useState('');
    const [upsType, setUpsType] = useState('');
    const [sheetSize, setSheetSize] = useState('');
    const [shapeName, setShapeName] = useState('');
    const [addInXForUps, setAddInXForUps] = useState('');
    const [addInYForUps, setAddInYForUps] = useState('');

    // Dropdowns data
    const [contentNames, setContentNames] = useState<string[]>([]);
    const [shapeNames, setShapeNames] = useState<string[]>([]);
    const [formulaList, setFormulaList] = useState<KeylineFormulaDto[]>([]);
    const [formulaX1, setFormulaX1] = useState<string[]>([]);
    const [formulaY1, setFormulaY1] = useState<string[]>([]);
    const [formulaX2, setFormulaX2] = useState<string[]>([]);
    const [formulaY2, setFormulaY2] = useState<string[]>([]);

    // Formula panel
    const [selectedFormulaId, setSelectedFormulaId] = useState<number | null>(null);
    const [formulaText, setFormulaText] = useState('');

    // Grids
    const [coordRows, setCoordRows] = useState<GridRow[]>([]);
    const [planningRows, setPlanningRows] = useState<PlanningRow[]>([]);

    // SVG preview
    const [zoom, setZoom] = useState(1);
    const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [modalZoom, setModalZoom] = useState(1);
    const [view3D, setView3D] = useState(false);

    // Dimension variables
    const [vars, setVars] = useState<Record<string, number>>({
        W: 40, L: 60, H: 100, PF: 10, OF: 15, BF: 11.25, FH: 6.5, TH: 9, xd: 5, yd: 5
    });

    const [isLoadingMeta, setIsLoadingMeta] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const notify = (msg: string, type: 'success' | 'error' = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // ─── Load content names on mount ──────────────────────────────────────────
    useEffect(() => {
        keylineGetContentNames().then(setContentNames).catch(() => { });
        keylineGetFormulas().then(setFormulaList).catch(() => { });
    }, []);

    // ─── When ContentType/Grain/UpsType changes → single combined API call ────
    useEffect(() => {
        if (!contentType || !grain || !upsType) return;
        setIsLoadingMeta(true);
        keylineGetMeta(contentType, grain, upsType)
            .then(meta => {
                setShapeNames(meta.shapeNames);
                setFormulaX1(meta.formulaX1);
                setFormulaY1(meta.formulaY1);
                setFormulaX2(meta.formulaX2);
                setFormulaY2(meta.formulaY2);
            })
            .catch(() => { })
            .finally(() => setIsLoadingMeta(false));
    }, [contentType, grain, upsType]);

    // ─── SVG File Upload ──────────────────────────────────────────────────────
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.endsWith('.svg')) { alert('Please upload a valid .svg file.'); return; }

        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(ev.target!.result as string, 'image/svg+xml');
                const svgEl = doc.querySelector('svg');
                if (!svgEl) { alert('No valid SVG content found.'); return; }

                const extracted: GridRow[] = [];

                svgEl.querySelectorAll('line').forEach((line, i) => {
                    const dash = line.getAttribute('stroke-dasharray');
                    const style = dash ? 'Dashed' : 'Solid';
                    extracted.push({
                        _id: uid(), shapeName: `Line ${i + 1}`,
                        lineType: 'Solid', lineStyles: style,
                        addInX1: '', addInY1: '', addInX2: '', addInY2: ''
                    });
                });

                svgEl.querySelectorAll('path').forEach((path, i) => {
                    const d = path.getAttribute('d');
                    if (d) {
                        extracted.push({
                            _id: uid(), shapeName: `Path ${i + 1}`,
                            lineType: 'Curve', lineStyles: 'Solid',
                            addInX1: '', addInY1: '', addInX2: '', addInY2: ''
                        });
                    }
                });

                setCoordRows(extracted);
                notify(`Loaded ${extracted.length} shapes from SVG`);
            } catch {
                alert('Error parsing SVG file.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // ─── Load Data from DB ────────────────────────────────────────────────────
    const handleLoadData = async () => {
        if (!contentType) { alert('Please select Content Name.'); return; }
        if (!grain) { alert('Please select Grain.'); return; }
        if (!upsType) { alert('Please select Ups Type.'); return; }

        if (!confirm('Are you sure you want to load the data?')) return;
        setIsLoadingData(true);
        try {
            const data = await keylineGetCoordinates(contentType, grain, upsType);
            const rows = data.map(d => ({ ...d, _id: uid() }));
            setCoordRows(rows);
            if (rows.length > 0) {
                setAddInXForUps(rows[0].addInXForUps ?? '');
                setAddInYForUps(rows[0].addInYForUps ?? '');
            }
            notify(`Loaded ${rows.length} coordinates`);
        } catch { notify('Failed to load data', 'error'); }
        finally { setIsLoadingData(false); }
    };

    // ─── Add Shape (shape-wise data append) ───────────────────────────────────
    const handleAddShape = async () => {
        if (!shapeName) { alert('Please select Shape Name.'); return; }
        try {
            const data = await keylineGetShapeWiseData(contentType, grain, upsType, shapeName);
            const newRows = data.map(d => ({ ...d, _id: uid() }));
            setCoordRows(prev => [...prev, ...newRows]);
            notify(`Added ${newRows.length} rows for shape: ${shapeName}`);
        } catch { notify('Failed to add shape', 'error'); }
    };

    // ─── Save Coordinates ─────────────────────────────────────────────────────
    const handleSaveCoordinates = async () => {
        if (!contentType) { alert('Please select Content Name.'); return; }
        if (!grain) { alert('Please select Grain.'); return; }
        if (!upsType) { alert('Please select Ups Type.'); return; }
        if (coordRows.length === 0) { alert('No coordinates to save.'); return; }

        try {
            const payload = coordRows.map(r => ({
                ...r, addInXForUps: addInXForUps, addInYForUps: addInYForUps
            }));
            await keylineSaveCoordinates({ coordinates: payload, contentName: contentType, grain, upsType });
            notify('Coordinates saved successfully!');
        } catch { notify('Failed to save coordinates', 'error'); }
    };

    // ─── Save Across Grain ────────────────────────────────────────────────────
    const handleSaveAcrossGrain = async () => {
        if (grain === 'Across Grain') {
            alert("Load 'With Grain' data first before saving as Across Grain.");
            return;
        }
        if (!confirm("Save current grid as 'Across Grain'? (X↔Y axes will be swapped)")) return;
        try {
            const swapped = coordRows.map(r => ({
                ...r,
                addInX1: r.addInY2, addInY1: r.addInX2,
                addInX2: r.addInY1, addInY2: r.addInX1,
                addInXForUps: addInYForUps, addInYForUps: addInXForUps
            }));
            await keylineSaveCoordinates({ coordinates: swapped, contentName: contentType, grain: 'Across Grain', upsType });
            notify('Across Grain coordinates saved!');
        } catch { notify('Failed to save Across Grain', 'error'); }
    };

    // ─── Delete Coordinates ───────────────────────────────────────────────────
    const handleDeleteCoordinates = async () => {
        if (!contentType || !grain || !upsType) { alert('Select Content, Grain and Ups Type first.'); return; }
        if (!confirm('Delete all coordinates for this Content + Grain + UpsType?')) return;
        try {
            await keylineDeleteCoordinates(contentType, grain, upsType);
            setCoordRows([]);
            notify('Coordinates deleted');
        } catch { notify('Failed to delete', 'error'); }
    };

    // ─── Formula actions ──────────────────────────────────────────────────────
    const handleSaveFormula = async () => {
        if (!formulaText.trim()) { alert('Enter a formula first.'); return; }
        try {
            await keylineSaveFormula({ formula: formulaText, editFlag: selectedFormulaId !== null, formulaID: selectedFormulaId ?? undefined });
            const updated = await keylineGetFormulas();
            setFormulaList(updated);
            setFormulaText('');
            setSelectedFormulaId(null);
            notify('Formula saved');
        } catch { notify('Failed to save formula', 'error'); }
    };

    const handleDeleteFormula = async () => {
        if (!selectedFormulaId) { alert('Select a formula first.'); return; }
        if (!confirm('Delete this formula?')) return;
        try {
            await keylineDeleteFormula(selectedFormulaId);
            const updated = await keylineGetFormulas();
            setFormulaList(updated);
            setFormulaText('');
            setSelectedFormulaId(null);
            notify('Formula deleted');
        } catch { notify('Failed to delete formula', 'error'); }
    };

    // ─── Planning actions ─────────────────────────────────────────────────────
    const handleAddPlanning = () => {
        if (!contentType) { alert('Select Content Type first.'); return; }
        const formula = formulaList.find(f => f.id === selectedFormulaId)?.formula ?? formulaText;
        const newRow: PlanningRow = {
            _id: uid(), contentType, grain, upsType, sheetSize, formula
        };
        setPlanningRows(prev => [...prev, newRow]);
    };

    const handleLoadPlanning = async () => {
        if (!contentType) { alert('Select Content Type first.'); return; }
        try {
            const data = await keylineGetPlanning(contentType);
            setPlanningRows(data.map(d => ({ ...d, _id: uid() })));
            notify(`Loaded planning data`);
        } catch { notify('Failed to load planning', 'error'); }
    };

    const handleSavePlanning = async () => {
        if (planningRows.length === 0) { alert('No planning data to save.'); return; }
        try {
            const contentName = planningRows[0].contentType ?? contentType;
            await keylineSavePlanning({ planning: planningRows, contentName });
            notify('Planning saved successfully!');
        } catch { notify('Failed to save planning', 'error'); }
    };

    const handleDeletePlanning = async () => {
        if (!contentType) { alert('Select Content Type first.'); return; }
        if (!confirm('Delete all planning for this content?')) return;
        try {
            await keylineDeletePlanning(contentType);
            setPlanningRows([]);
            notify('Planning deleted');
        } catch { notify('Failed to delete planning', 'error'); }
    };

    // ─── Download SVG ─────────────────────────────────────────────────────────
    const handleDownloadSVG = () => {
        if (coordRows.length === 0) { notify('No coordinates to download', 'error'); return; }

        const svgSize = 400;
        const xd = vars.xd ?? 5;
        const yd = vars.yd ?? 5;

        const shapes = coordRows.map(row => {
            const x1v = evalFormula(row.addInX1, vars);
            const y1v = evalFormula(row.addInY1, vars);
            const x2v = evalFormula(row.addInX2, vars);
            const y2v = evalFormula(row.addInY2, vars);
            if (x1v === null || y1v === null || x2v === null || y2v === null) return '';

            const rx1 = xd + x1v, ry1 = yd + y1v;
            const rx2 = xd + x2v, ry2 = yd + y2v;
            const dash = row.lineStyles === 'Dashed' ? ' stroke-dasharray="2,2"' : '';
            const stroke = 'stroke="#1e3a5f" stroke-width="0.5" fill="none"';

            if (row.lineType === 'Circle') {
                const r = Math.sqrt((rx2 - rx1) ** 2 + (ry2 - ry1) ** 2) / 2;
                return `<path d="M ${rx1} ${ry1} A ${r} ${r} 0 1 1 ${rx2} ${ry2}" ${stroke}${dash}/>`;
            }
            if (row.lineType === 'Curve') {
                return `<path d="M ${rx2} ${ry2} Q ${rx2} ${ry1} ${rx1} ${ry1}" ${stroke}${dash}/>`;
            }
            return `<line x1="${rx1}" y1="${ry1}" x2="${rx2}" y2="${ry2}" ${stroke}${dash}/>`;
        }).filter(Boolean).join('\n  ');

        const svgContent = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg">`,
            `  <rect width="${svgSize}" height="${svgSize}" fill="white"/>`,
            `  ${shapes}`,
            '</svg>'
        ].join('\n');

        const filename = [contentType, grain, upsType].filter(Boolean).join('_') || 'keyline';
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        notify('SVG downloaded successfully!');
    };

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-4 min-h-full">
            {/* Notification */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {notification.msg}
                </div>
            )}

            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Layers className="w-6 h-6 text-blue-600" />
                        Key Line Generator
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Design and manage SVG keyline coordinates for packaging</p>
                </div>
            </div>

            {/* ── Row 1: Filters + Formula Panel ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Filter Panel */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Configuration
                    </h2>
                    {isLoadingMeta && (
                        <div className="flex items-center gap-2 mb-2 text-xs text-blue-600 dark:text-blue-400">
                            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                            Loading dropdown data...
                        </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {/* SVG File */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">SVG File</label>
                            <button onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-gray-600 dark:text-gray-300">
                                <Upload className="w-4 h-4" /> Upload SVG
                            </button>
                            <input ref={fileInputRef} type="file" accept=".svg" className="hidden" onChange={handleFileUpload} />
                        </div>

                        {/* Content Type */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Content Type / Name</label>
                            <Select value={contentType} onChange={setContentType} options={contentNames} placeholder="Select Content" />
                        </div>

                        {/* Grain */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Grain</label>
                            <Select value={grain} onChange={setGrain} options={GRAIN_OPTIONS} placeholder="Select Grain" />
                        </div>

                        {/* Ups Type */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Ups Type</label>
                            <Select value={upsType} onChange={v => setUpsType(v)} options={UPS_OPTIONS} placeholder="Select Ups Type" />
                        </div>

                        {/* Sheet Size */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Sheet Size</label>
                            <Select value={sheetSize} onChange={setSheetSize} options={SHEET_SIZE_OPTIONS} placeholder="Select Size" />
                        </div>

                        {/* Shape Name */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Shape Type</label>
                            <Select value={shapeName} onChange={setShapeName} options={shapeNames} placeholder="Select Shape" />
                        </div>

                        {/* AddInXForUps */}
                        <LabelInput label="Add In X For Ups" value={addInXForUps} onChange={setAddInXForUps} placeholder="e.g. W+PF" />
                        <LabelInput label="Add In Y For Ups" value={addInYForUps} onChange={setAddInYForUps} placeholder="e.g. L+OF" />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <button
                            onClick={handleLoadData}
                            disabled={isLoadingData || isLoadingMeta}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60"
                        >
                            <RotateCcw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
                            {isLoadingData ? 'Loading...' : 'Load Data'}
                        </button>
                        <button onClick={handleAddShape} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                            <Plus className="w-3.5 h-3.5" /> Add Shape
                        </button>
                        <button onClick={handleSaveCoordinates} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                            <Save className="w-3.5 h-3.5" /> Save Coordinates
                        </button>
                        <button onClick={handleDeleteCoordinates} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" /> Delete Coordinates
                        </button>
                        <button onClick={handleDownloadSVG} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
                            <Download className="w-3.5 h-3.5" /> Download SVG
                        </button>
                    </div>
                </div>

                {/* Formula Panel */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm flex flex-col gap-3">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Formulas
                    </h2>

                    {/* Formula select */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Select Formula</label>
                        <select
                            value={selectedFormulaId ?? ''}
                            onChange={e => {
                                const id = Number(e.target.value);
                                setSelectedFormulaId(id || null);
                                const f = formulaList.find(x => x.id === id);
                                setFormulaText(f?.formula ?? '');
                            }}
                            className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">-- New Formula --</option>
                            {formulaList.map(f => <option key={f.id} value={f.id}>{f.formula}</option>)}
                        </select>
                    </div>

                    <LabelInput label="Formula Text" value={formulaText} onChange={setFormulaText} placeholder="e.g. W+PF+10" />

                    <div className="flex gap-2">
                        <button onClick={handleSaveFormula} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                            <Save className="w-3.5 h-3.5" /> Save Formula
                        </button>
                        <button onClick={handleDeleteFormula} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                    </div>

                    {/* Dimension Variables */}
                    <div className="mt-1 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-2">Dimension Variables</label>
                        <div className="grid grid-cols-2 gap-1.5">
                            {Object.entries(vars).map(([k, v]) => (
                                <div key={k} className="flex items-center gap-1.5">
                                    <span className="text-xs font-mono font-medium text-blue-600 dark:text-blue-400 w-8 shrink-0">{k}</span>
                                    <input type="number" value={v}
                                        onChange={e => setVars(prev => ({ ...prev, [k]: Number(e.target.value) }))}
                                        className="flex-1 text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Row 2: Grid + SVG Preview ── */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="flex h-[500px]">
                    {/* Left: Coordinate Grid */}
                    <div className="flex-1 min-w-0 p-4 flex flex-col border-r border-gray-200 dark:border-gray-700">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Coordinate Grid</h2>
                        <CoordGrid
                            rows={coordRows}
                            onChange={setCoordRows}
                            formulaX1={formulaX1}
                            formulaY1={formulaY1}
                            formulaX2={formulaX2}
                            formulaY2={formulaY2}
                            shapeNames={shapeNames}
                            highlightedId={highlightedRowId}
                            onHighlight={setHighlightedRowId}
                            onRefreshDraw={() => setZoom(z => z)}
                            onSaveAcrossGrain={handleSaveAcrossGrain}
                        />
                    </div>

                    {/* Right: SVG Preview */}
                    <div className="w-80 shrink-0 p-4 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">SVG Preview</h2>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Zoom Out">
                                    <ZoomOut className="w-4 h-4 text-gray-500" />
                                </button>
                                <span className="text-xs text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                                <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Zoom In">
                                    <ZoomIn className="w-4 h-4 text-gray-500" />
                                </button>
                                <button
                                    onClick={() => { setModalZoom(1); setShowFullscreen(true); }}
                                    className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors ml-1"
                                    title="Full Screen Preview"
                                >
                                    <Maximize2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <SvgPreview rows={coordRows} vars={vars} zoom={zoom} highlightedId={highlightedRowId} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Fullscreen SVG Modal ── */}
            {showFullscreen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setShowFullscreen(false)}
                >
                    <div
                        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col"
                        style={{ width: '90vw', height: '90vh' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <div className="flex items-center gap-2">
                                <Layers className="w-5 h-5 text-blue-600" />
                                <span className="font-semibold text-gray-800 dark:text-white text-sm">
                                    Key Line Preview — {view3D ? '3D Box' : 'Full Screen'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* 3D / Flat toggle */}
                                <button
                                    onClick={() => setView3D(v => !v)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${view3D
                                        ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    title={view3D ? 'Switch to Flat View' : 'Switch to 3D View'}
                                >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                                    </svg>
                                    {view3D ? 'Flat View' : '3D View'}
                                </button>

                                {/* Zoom controls — only in flat mode */}
                                {!view3D && (<>
                                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
                                    <button onClick={() => setModalZoom(z => Math.max(0.25, z - 0.25))} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600">
                                        <ZoomOut className="w-3.5 h-3.5" /> Zoom Out
                                    </button>
                                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-12 text-center">
                                        {Math.round(modalZoom * 100)}%
                                    </span>
                                    <button onClick={() => setModalZoom(z => Math.min(6, z + 0.25))} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600">
                                        <ZoomIn className="w-3.5 h-3.5" /> Zoom In
                                    </button>
                                    <button onClick={() => setModalZoom(1)} className="px-2 py-1 rounded-lg text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600">
                                        Reset
                                    </button>
                                </>)}

                                <button
                                    onClick={() => { setShowFullscreen(false); setView3D(false); }}
                                    className="ml-2 p-1.5 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/50 transition-colors"
                                    title="Close"
                                >
                                    <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        {view3D ? (
                            <div className="flex-1 bg-gray-50 dark:bg-gray-950 rounded-b-2xl">
                                <Box3DPreview vars={vars} />
                            </div>
                        ) : (
                            <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950 rounded-b-2xl">
                                <div className="min-h-full min-w-full flex items-center justify-center p-6">
                                    <FullscreenSvgPreview rows={coordRows} vars={vars} zoom={modalZoom} highlightedId={highlightedRowId} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Row 3: Planning Section ── */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Layers className="w-4 h-4" /> Sheet Planning
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={handleAddPlanning} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                            <Plus className="w-3.5 h-3.5" /> Add Planning
                        </button>
                        <button onClick={handleLoadPlanning} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
                            <RotateCcw className="w-3.5 h-3.5" /> Load Planning
                        </button>
                        <button onClick={handleSavePlanning} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            <Save className="w-3.5 h-3.5" /> Save Planning
                        </button>
                        <button onClick={handleDeletePlanning} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" /> Delete Planning
                        </button>
                    </div>
                </div>
                <PlanningGrid rows={planningRows} onChange={setPlanningRows} />
            </div>
        </div>
    );
};

export default KeyLineGenerator;
