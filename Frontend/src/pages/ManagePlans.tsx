import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import {
    getCatalogFeatures, upsertFeature,
    getPlans, upsertPlan, deletePlan,
    type FeatureDto, type PlanDto, type PlanSubFeature,
} from '../services/api';

/* ════════════════════════════════════════════════════════════════════════
   Manage Plans (Internal App, indus admins) — the GLOBAL plan catalog.

   2-table model: Feature → Plans. Everything about a plan (price, the
   customer-facing card fields, the bullet list, and sub-feature flags) lives
   inline on the plan — there is NO separate sub-feature master table.
     • Pick / create a Feature (Sahay, Email, …)
     • Create / edit Plans under it: name, display name, code, prices, the card
       blurb + bullets, and optional sub-feature on/off rows.
   Backend: PlanCatalogController (Indus DB). Applying plans to companies is a
   separate screen (Chunk 2).
   Responsive: stacks to one column on mobile, two columns on md+.
   ════════════════════════════════════════════════════════════════════════ */

const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

// Plan code = stable checkout id. Auto-built from feature + plan name, e.g.
// "Sahay" + "Premium Plan" → "sahay_premium_plan". lowercase, _-separated, safe.
const slugCode = (featureCode: string, planName: string) => {
    const clean = (s: string) => (s || '')
        .toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '_')   // non-alphanumerics → _
        .replace(/^_+|_+$/g, '');       // trim leading/trailing _
    const f = clean(featureCode);
    const n = clean(planName);
    if (!n) return '';
    // Avoid "sahay_sahay_pro" if the name already starts with the feature code.
    return f && !n.startsWith(f + '_') && n !== f ? `${f}_${n}` : n;
};
const card = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm';
const label = 'text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400';
const input = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:border-blue-500';
const btn = 'px-4 py-2 text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed';

const emptyPlan = (featureID: number): PlanDto => ({
    planID: 0, featureID, featureCode: '', planName: '', planDisplayName: '', planCode: '',
    billingCycle: 'MONTHLY', unitPrice: 0, annualPrice: 0, perUser: false, perUserNote: '',
    blurb: '', highlight: false, badge: '', features: [], subFeatures: [],
    razorpayPlanId: null, isActive: true,
});

const ManagePlans: React.FC = () => {
    const [features, setFeatures] = useState<FeatureDto[]>([]);
    const [featureId, setFeatureId] = useState<number>(0);
    const [plans, setPlans] = useState<PlanDto[]>([]);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    // New-feature inline form
    const [newFeatCode, setNewFeatCode] = useState('');
    const [newFeatName, setNewFeatName] = useState('');

    // Plan editor (null = closed)
    const [editPlan, setEditPlan] = useState<PlanDto | null>(null);
    // Whether the user has manually edited the plan code (so we stop auto-filling it).
    const [codeTouched, setCodeTouched] = useState(false);
    // True only when a mousedown started on the modal backdrop — used so a text-selection
    // drag that releases on the backdrop doesn't close the popup.
    const backdropDownRef = useRef(false);

    const flash = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 3000); };

    const loadFeatures = useCallback(async () => {
        const f = await getCatalogFeatures();
        setFeatures(f);
        if (!featureId && f.length) setFeatureId(f[0].featureID);
    }, [featureId]);

    const loadPlans = useCallback(async (fid: number) => {
        if (!fid) { setPlans([]); return; }
        setPlans(await getPlans(fid));
    }, []);

    useEffect(() => { loadFeatures(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { loadPlans(featureId); }, [featureId, loadPlans]);

    // ── Feature actions ────────────────────────────────────────────────────
    const addFeature = async () => {
        if (!newFeatCode.trim() || !newFeatName.trim()) return;
        const r = await upsertFeature({ featureCode: newFeatCode.trim(), featureName: newFeatName.trim() });
        flash(r.success, r.message);
        if (r.success) { setNewFeatCode(''); setNewFeatName(''); await loadFeatures(); if (r.data) setFeatureId(r.data.featureID); }
    };

    // ── Plan editor ────────────────────────────────────────────────────────
    const openNewPlan = () => { setCodeTouched(false); setEditPlan(emptyPlan(featureId)); };
    const openEditPlan = (p: PlanDto) => {
        // Existing plans already have a code — treat it as user-owned so we never rewrite it.
        setCodeTouched(!!p.planCode?.trim());
        setEditPlan({ ...p, features: p.features ?? [], subFeatures: p.subFeatures ?? [] });
    };

    // Plan name handler: also auto-fill the code (until the user edits the code themselves).
    const onPlanNameChange = (name: string) => {
        setEditPlan((p) => {
            if (!p) return p;
            const next = { ...p, planName: name };
            if (!codeTouched) next.planCode = slugCode(currentFeature?.featureCode || '', name);
            return next;
        });
    };
    const onPlanCodeChange = (code: string) => {
        setCodeTouched(true);
        setField('planCode', code);
    };

    const setField = <K extends keyof PlanDto>(key: K, val: PlanDto[K]) =>
        setEditPlan((p) => (p ? { ...p, [key]: val } : p));

    // Card bullet list (Features) — newline-separated textarea.
    const featuresText = (editPlan?.features ?? []).join('\n');
    const setFeaturesText = (text: string) =>
        setField('features', text.split('\n').map((s) => s.trim()).filter(Boolean));

    // Sub-feature on/off rows (key/label/enabled).
    const addSubRow = () => setField('subFeatures', [...(editPlan?.subFeatures ?? []), { key: '', label: '', enabled: true }]);
    const setSubRow = (i: number, patch: Partial<PlanSubFeature>) =>
        setField('subFeatures', (editPlan?.subFeatures ?? []).map((s, idx) => idx === i ? { ...s, ...patch } : s));
    const removeSubRow = (i: number) =>
        setField('subFeatures', (editPlan?.subFeatures ?? []).filter((_, idx) => idx !== i));

    const savePlan = async () => {
        if (!editPlan || !editPlan.planName.trim()) { flash(false, 'Plan name is required.'); return; }
        // Plan code is the checkout id AND the key the dashboard catalog uses — a plan
        // without it is invisible/unbuyable on the dashboard, so it's mandatory.
        const finalCode = (editPlan.planCode?.trim() || slugCode(currentFeature?.featureCode || '', editPlan.planName)).trim();
        if (!finalCode) { flash(false, 'Plan code is required (used at checkout).'); return; }
        const r = await upsertPlan({
            planID: editPlan.planID || undefined,
            featureID: editPlan.featureID,
            planName: editPlan.planName.trim(),
            planDisplayName: editPlan.planDisplayName?.trim() || null,
            planCode: finalCode,
            billingCycle: editPlan.billingCycle,
            unitPrice: Number(editPlan.unitPrice) || 0,
            annualPrice: Number(editPlan.annualPrice) || 0,
            perUser: editPlan.perUser,
            perUserNote: editPlan.perUserNote?.trim() || null,
            blurb: editPlan.blurb?.trim() || null,
            highlight: editPlan.highlight,
            badge: editPlan.badge?.trim() || null,
            features: editPlan.features ?? [],
            subFeatures: (editPlan.subFeatures ?? []).filter((s) => s.key.trim()),
            isActive: editPlan.isActive,
        });
        flash(r.success, r.message);
        if (r.success) { setEditPlan(null); await loadPlans(featureId); }
    };

    const removePlan = async (id: number) => {
        const r = await deletePlan(id);
        flash(r.success, r.message);
        if (r.success) await loadPlans(featureId);
    };

    const currentFeature = features.find(f => f.featureID === featureId);

    // Example placeholders derived from the SELECTED feature (not hardcoded to Sahay),
    // so the Email feature shows "e.g. Email Pro" / "email_pro", etc.
    const exFeatureName = currentFeature?.featureName || currentFeature?.featureCode || 'Plan';
    const exPlanName = `${exFeatureName} Pro`;
    const exPlanCode = slugCode(currentFeature?.featureCode || '', `${exFeatureName} Pro`) || 'plan_code';
    const exDisplayName = `${exFeatureName} Professional`;

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">Manage Plans</h1>
                {msg && (
                    <span className={`text-sm font-semibold px-3 py-1 rounded-lg ${msg.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {msg.text}
                    </span>
                )}
            </div>

            {/* Feature picker + add */}
            <div className={`${card} p-4 mb-4`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={label}>Feature</label>
                        <select className={`${input} mt-1`} value={featureId} onChange={e => setFeatureId(Number(e.target.value))}>
                            {features.length === 0 && <option value={0}>No features yet</option>}
                            {features.map(f => <option key={f.featureID} value={f.featureID}>{f.featureName} ({f.featureCode})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={label}>Add a new feature</label>
                        <div className="flex flex-col sm:flex-row gap-2 mt-1">
                            <input className={input} placeholder="Code (e.g. Sahay)" value={newFeatCode} onChange={e => setNewFeatCode(e.target.value)} />
                            <input className={input} placeholder="Name" value={newFeatName} onChange={e => setNewFeatName(e.target.value)} />
                            <button className={`${btn} bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap`} onClick={addFeature}>
                                <Plus size={16} className="inline -mt-0.5 mr-1" />Add
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {currentFeature && (
                <div className={`${card} p-4`}>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-gray-800 dark:text-gray-100">Plans for {currentFeature.featureName}</h2>
                        <button className={`${btn} bg-green-600 text-white hover:bg-green-700`} onClick={openNewPlan} disabled={!featureId}>
                            <Plus size={16} className="inline -mt-0.5 mr-1" />New Plan
                        </button>
                    </div>
                    <div className="space-y-2">
                        {plans.length === 0 && <p className="text-sm text-gray-500">No plans yet.</p>}
                        {plans.map(p => (
                            <div key={p.planID} className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                                            {p.planDisplayName || p.planName}
                                            {p.planCode && <span className="ml-2 text-xs text-gray-400 font-mono">{p.planCode}</span>}
                                            {p.highlight && <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{p.badge || 'Highlighted'}</span>}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {inr(p.unitPrice)}/mo{p.annualPrice ? ` · ${inr(p.annualPrice)}/yr` : ''}{p.perUser ? ' · per user' : ''}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button className="text-blue-600 hover:text-blue-800 text-sm font-semibold" onClick={() => openEditPlan(p)}>Edit</button>
                                        <button className="text-red-500 hover:text-red-700" onClick={() => removePlan(p.planID)} title="Delete"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                {(p.features?.length ?? 0) > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {p.features.slice(0, 5).map((f, i) => (
                                            <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">{f}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Plan editor modal */}
            {editPlan && (
                <div
                    className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-4"
                    // Close only on a TRUE backdrop click: the press AND release must both be
                    // on the backdrop itself. This stops a text selection that drags onto the
                    // backdrop (mouseup outside the dialog) from closing the popup.
                    onMouseDown={e => { if (e.target === e.currentTarget) backdropDownRef.current = true; }}
                    onClick={e => { if (e.target === e.currentTarget && backdropDownRef.current) setEditPlan(null); backdropDownRef.current = false; }}
                >
                    <div className={`${card} w-full md:max-w-lg max-h-[90vh] overflow-y-auto p-5 rounded-b-none md:rounded-xl`} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{editPlan.planID ? 'Edit Plan' : 'New Plan'}</h3>
                            <button onClick={() => setEditPlan(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={label}>Plan name (internal)</label>
                                    <input className={`${input} mt-1`} value={editPlan.planName} onChange={e => onPlanNameChange(e.target.value)} placeholder={`e.g. ${exPlanName}`} />
                                </div>
                                <div>
                                    <label className={label}>Display name (on card)</label>
                                    <input className={`${input} mt-1`} value={editPlan.planDisplayName ?? ''} onChange={e => setField('planDisplayName', e.target.value)} placeholder={`e.g. ${exDisplayName}`} />
                                </div>
                            </div>
                            <div>
                                <label className={label}>Plan code (checkout id) <span className="text-red-500">*</span></label>
                                <input className={`${input} mt-1`} value={editPlan.planCode ?? ''} onChange={e => onPlanCodeChange(e.target.value)} placeholder={`e.g. ${exPlanCode}`} />
                                <p className="text-[11px] text-gray-400 mt-1">Auto-filled from the plan name. Required — the dashboard uses this to show &amp; sell the plan.</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className={label}>Billing cycle</label>
                                    <select className={`${input} mt-1`} value={editPlan.billingCycle} onChange={e => setField('billingCycle', e.target.value)}>
                                        <option value="MONTHLY">Monthly</option>
                                        <option value="ANNUAL">Annual</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={label}>Monthly (₹)</label>
                                    <input type="number" className={`${input} mt-1`} value={editPlan.unitPrice} onChange={e => setField('unitPrice', Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className={label}>Annual (₹)</label>
                                    <input type="number" className={`${input} mt-1`} value={editPlan.annualPrice ?? 0} onChange={e => setField('annualPrice', Number(e.target.value))} />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <input type="checkbox" checked={editPlan.perUser} onChange={e => setField('perUser', e.target.checked)} />
                                Priced per user (seat-based)
                            </label>
                            <div>
                                <label className={label}>Per-user note</label>
                                <input className={`${input} mt-1`} value={editPlan.perUserNote ?? ''} onChange={e => setField('perUserNote', e.target.value)} placeholder="e.g. Priced per user (seat)." />
                            </div>
                            <div>
                                <label className={label}>Blurb (above cards)</label>
                                <input className={`${input} mt-1`} value={editPlan.blurb ?? ''} onChange={e => setField('blurb', e.target.value)} placeholder="Short feature description" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mt-5">
                                    <input type="checkbox" checked={editPlan.highlight} onChange={e => setField('highlight', e.target.checked)} />
                                    Highlight (most popular)
                                </label>
                                <div>
                                    <label className={label}>Badge</label>
                                    <input className={`${input} mt-1`} value={editPlan.badge ?? ''} onChange={e => setField('badge', e.target.value)} placeholder="e.g. Most popular" />
                                </div>
                            </div>
                            <div>
                                <label className={label}>Card bullets (one per line)</label>
                                <textarea className={`${input} mt-1`} rows={4} value={featuresText} onChange={e => setFeaturesText(e.target.value)}
                                    placeholder={'Natural-language data Q&A\nConversation history\n…'} />
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <label className={label}>Sub-features (on/off)</label>
                                    <button type="button" className="text-blue-600 hover:text-blue-800 text-xs font-semibold" onClick={addSubRow}>
                                        <Plus size={13} className="inline -mt-0.5 mr-0.5" />Add
                                    </button>
                                </div>
                                <div className="space-y-1 mt-1">
                                    {(editPlan.subFeatures ?? []).length === 0 && <p className="text-xs text-gray-500">None. Sub-features are optional.</p>}
                                    {(editPlan.subFeatures ?? []).map((s, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <input className={`${input} flex-1`} value={s.key} onChange={e => setSubRow(i, { key: e.target.value })} placeholder="key (e.g. auto_charts)" />
                                            <input className={`${input} flex-1`} value={s.label} onChange={e => setSubRow(i, { label: e.target.value })} placeholder="Label" />
                                            <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 shrink-0">
                                                <input type="checkbox" checked={s.enabled} onChange={e => setSubRow(i, { enabled: e.target.checked })} />On
                                            </label>
                                            <button type="button" className="text-red-500 hover:text-red-700 shrink-0" onClick={() => removeSubRow(i)}><Trash2 size={15} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-5 sticky bottom-0 bg-white dark:bg-gray-800 pt-2">
                            <button className={`${btn} bg-blue-600 text-white hover:bg-blue-700 flex-1`} onClick={savePlan}>
                                <Save size={16} className="inline -mt-0.5 mr-1" />Save Plan
                            </button>
                            <button className={`${btn} bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200`} onClick={() => setEditPlan(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagePlans;
