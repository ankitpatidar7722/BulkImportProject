import type { HingedPanel, FoldStage } from './keyline3D'

// ─── ShapeType-driven fold sequencing ────────────────────────────────────────
//
// A panel's ShapeType (stored per keyline coordinate row in
// ContentWiseKeylineCoordinates) says what the panel *is*, which in turn says
// *when* it folds while the carton closes:
//
//   1 = LENGTH / WIDTH   (main body walls stand up first)
//   2 = PASTING FLAP     (glue flap folds inside)
//   3 = DUST FLAP        (side dust flaps close at 90 degrees)
//   4 = OPEN FLAP        (top tuck flap tucks inside length)
//   5 = BOTTOM FLAP      (opposite of open flap)
//   6 = TUCKIN WIDTH     (final lock - closes last)
//   HEIGHT = root panel, never folds
//
// Extracted from KeyLineGenerator.tsx so the embedded 3D viewer and the
// generator page share one implementation instead of drifting apart.

/** Default fold sequence (generic box types). */
export const SHAPE_FOLD_SEQ: Record<string, number> = {
    'LENGTH':       1,
    'WIDTH':        1,
    'PASTING FLAP': 2,
    'DUST FLAP':    3,
    'OPEN FLAP':    4,
    'BOTTOM FLAP':  5,
    'TUCKIN WIDTH': 6,
}
export const DEFAULT_MAX_SEQ = 6

/** Content-specific fold sequences - keyed by content name (case-insensitive). */
export const CONTENT_FOLD_SEQ: Record<string, { seq: Record<string, number>; maxSeq: number }> = {
    'CAKE-BOX': {
        seq: {
            'SIDE FLAP': 1,
            'DUST FLAP': 2,
            'LENGTH':    3,
            'TOP FLAP':  4,
            'OPEN FLAP': 5,
        },
        maxSeq: 5,
    },
}

/** The sequence table that applies to a given content name. */
export function foldSeqFor(contentType?: string) {
    const contentKey = (contentType ?? '').toUpperCase().trim()
    return CONTENT_FOLD_SEQ[contentKey] ?? { seq: SHAPE_FOLD_SEQ, maxSeq: DEFAULT_MAX_SEQ }
}

/**
 * Does this ShapeType map to a known fold step? Matching is "contains", so
 * "DUST FLAP LEFT" matches "DUST FLAP" - but "DUSTFLAP" (no space) does not.
 */
export function isRecognisedShapeType(shapeType: string | undefined, contentType?: string): boolean {
    const st = (shapeType ?? '').toUpperCase().trim()
    if (!st) return false
    const { seq } = foldSeqFor(contentType)
    return Object.keys(seq).some(key => st.includes(key))
}

/**
 * How much of this box has usable ShapeType data.
 *
 * Only foldable panels (depth > 0) count - the root panel never folds and is
 * not expected to carry a ShapeType. Returns 0..1.
 *
 * This exists because ShapeType is being filled in gradually. A box with one
 * stray value ("ANKIT", "CROOKED LINE", "3") must not be treated as fully
 * tagged, or every other panel silently falls back to depth ordering and the
 * animation looks wrong. See pickFoldSchedule below.
 */
export function shapeTypeCoverage(tree: HingedPanel[], contentType?: string): number {
    const foldable = tree.filter(p => p.depth > 0)
    if (foldable.length === 0) return 0
    const tagged = foldable.filter(p => isRecognisedShapeType(p.shapeType, contentType)).length
    return tagged / foldable.length
}

/**
 * Build the fold order from each panel's ShapeType.
 * Panels whose ShapeType is missing or unrecognised fall back to their depth.
 */
export function buildShapeTypeFoldSchedule(
    tree: HingedPanel[],
    contentType?: string,
): FoldStage[] {
    // Look up content-specific sequence, fall back to generic
    const { seq: foldSeq, maxSeq } = foldSeqFor(contentType)

    return tree
        .filter(p => p.depth > 0)
        .map(p => {
            const st = (p.shapeType ?? '').toUpperCase().trim()
            let seq = 0
            for (const [key, val] of Object.entries(foldSeq)) {
                if (st.includes(key)) { seq = val; break }
            }
            if (seq === 0) seq = Math.min(p.depth, maxSeq) // fallback: depth
            return {
                panelId: p.id,
                startProgress: (seq - 1) / maxSeq,
                endProgress:   seq / maxSeq,
                closedAngleDeg: 90,
            }
        })
}
