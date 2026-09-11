/** Player-owned waveform selection. Comments never set playhead CSS from this type. */

export const WAVEFORM_RANGE_DRAG_THRESHOLD_PX = 4;
export const WAVEFORM_RANGE_SNAP_PLAYHEAD_PX = 8;
export const WAVEFORM_RANGE_MIN_DURATION_SEC = 0.05;

export type WaveformSelection =
    | { kind: 'none' }
    | { kind: 'point'; timeSec: number }
    | { kind: 'range'; startSec: number; endSec: number };

export const WAVEFORM_SELECTION_NONE: WaveformSelection = { kind: 'none' };

export function clampTime(timeSec: number, durationSec: number): number {
    if (!(durationSec > 0) || !Number.isFinite(timeSec)) {
        return 0;
    }
    return Math.min(durationSec, Math.max(0, timeSec));
}

export function normalizeRange(
    startSec: number,
    endSec: number,
    durationSec: number,
): { startSec: number; endSec: number } | null {
    const start = clampTime(Math.min(startSec, endSec), durationSec);
    const end = clampTime(Math.max(startSec, endSec), durationSec);
    if (!(end - start >= WAVEFORM_RANGE_MIN_DURATION_SEC)) {
        return null;
    }
    return { startSec: start, endSec: end };
}

export function getRangeHighlightStyle(
    selection: WaveformSelection,
    durationSec: number,
): { left: string; width: string } | null {
    if (selection.kind !== 'range' || !(durationSec > 0)) {
        return null;
    }
    const range = normalizeRange(selection.startSec, selection.endSec, durationSec);
    if (!range) {
        return null;
    }
    return {
        left: `${(range.startSec / durationSec) * 100}%`,
        width: `${((range.endSec - range.startSec) / durationSec) * 100}%`,
    };
}

export function timeFromClientX(
    clientX: number,
    trackLeftPx: number,
    trackWidthPx: number,
    durationSec: number,
): number {
    if (!(trackWidthPx > 0) || !(durationSec > 0) || !Number.isFinite(clientX)) {
        return 0;
    }
    const progress = Math.min(1, Math.max(0, (clientX - trackLeftPx) / trackWidthPx));
    return progress * durationSec;
}

export function snapTimeToPlayhead(
    timeSec: number,
    playheadSec: number,
    durationSec: number,
    trackWidthPx: number,
): number {
    if (!(trackWidthPx > 0) || !(durationSec > 0) || !Number.isFinite(playheadSec)) {
        return timeSec;
    }
    const pxPerSec = trackWidthPx / durationSec;
    if (Math.abs(timeSec - playheadSec) * pxPerSec <= WAVEFORM_RANGE_SNAP_PLAYHEAD_PX) {
        return clampTime(playheadSec, durationSec);
    }
    return timeSec;
}

export function isTimeInRange(selection: WaveformSelection, timeSec: number): boolean {
    if (selection.kind !== 'range' || !Number.isFinite(timeSec)) {
        return false;
    }
    const start = Math.min(selection.startSec, selection.endSec);
    const end = Math.max(selection.startSec, selection.endSec);
    return timeSec >= start && timeSec <= end;
}

export function pointerDeltaIsRange(deltaPx: number): boolean {
    return Math.abs(deltaPx) >= WAVEFORM_RANGE_DRAG_THRESHOLD_PX;
}

export function resizeRangeEdge(
    selection: Extract<WaveformSelection, { kind: 'range' }>,
    edge: 'start' | 'end',
    timeSec: number,
    durationSec: number,
): { startSec: number; endSec: number } | null {
    if (edge === 'start') {
        return normalizeRange(timeSec, selection.endSec, durationSec);
    }
    return normalizeRange(selection.startSec, timeSec, durationSec);
}
