import {
    clampTime,
    getRangeHighlightStyle,
    isTimeInRange,
    normalizeRange,
    pointerDeltaIsRange,
    resizeRangeEdge,
    snapTimeToPlayhead,
    timeFromClientX,
    WAVEFORM_RANGE_DRAG_THRESHOLD_PX,
    WAVEFORM_RANGE_MIN_DURATION_SEC,
    WAVEFORM_SELECTION_NONE,
} from '../selection';

describe('selection', () => {
    test('should clamp times onto the duration', () => {
        expect(clampTime(-1, 8)).toBe(0);
        expect(clampTime(12, 8)).toBe(8);
        expect(clampTime(2, 8)).toBe(2);
        expect(clampTime(NaN, 8)).toBe(0);
    });

    test('should drop ranges shorter than the minimum duration', () => {
        expect(normalizeRange(1, 1 + WAVEFORM_RANGE_MIN_DURATION_SEC / 2, 8)).toBeNull();
        expect(normalizeRange(3, 1, 8)).toEqual({ endSec: 3, startSec: 1 });
    });

    test('should convert a range to overview left/width percent', () => {
        expect(getRangeHighlightStyle({ kind: 'range', startSec: 2, endSec: 6 }, 8)).toEqual({
            left: '25%',
            width: '50%',
        });
        expect(getRangeHighlightStyle(WAVEFORM_SELECTION_NONE, 8)).toBeNull();
    });

    test('should map a client x to media time', () => {
        expect(timeFromClientX(50, 0, 200, 8)).toBe(2);
        expect(timeFromClientX(-10, 0, 200, 8)).toBe(0);
        expect(timeFromClientX(400, 0, 200, 8)).toBe(8);
    });

    test('should snap to the playhead within 8px', () => {
        expect(snapTimeToPlayhead(2.1, 2, 8, 200)).toBe(2);
        expect(snapTimeToPlayhead(4, 2, 8, 200)).toBe(4);
    });

    test('should treat movement of 4px as a range gesture', () => {
        expect(pointerDeltaIsRange(WAVEFORM_RANGE_DRAG_THRESHOLD_PX - 1)).toBe(false);
        expect(pointerDeltaIsRange(WAVEFORM_RANGE_DRAG_THRESHOLD_PX)).toBe(true);
        expect(pointerDeltaIsRange(-WAVEFORM_RANGE_DRAG_THRESHOLD_PX)).toBe(true);
    });

    test('should report whether a time sits inside a range', () => {
        const range = { endSec: 6, kind: 'range' as const, startSec: 2 };
        expect(isTimeInRange(range, 2)).toBe(true);
        expect(isTimeInRange(range, 6)).toBe(true);
        expect(isTimeInRange(range, 1.9)).toBe(false);
        expect(isTimeInRange(WAVEFORM_SELECTION_NONE, 2)).toBe(false);
    });

    test('should resize one edge without crossing the other', () => {
        const range = { endSec: 6, kind: 'range' as const, startSec: 2 };
        expect(resizeRangeEdge(range, 'start', 4, 8)).toEqual({ endSec: 6, startSec: 4 });
        expect(resizeRangeEdge(range, 'end', 3, 8)).toEqual({ endSec: 3, startSec: 2 });
        expect(resizeRangeEdge(range, 'end', 2.01, 8)).toBeNull();
    });
});
