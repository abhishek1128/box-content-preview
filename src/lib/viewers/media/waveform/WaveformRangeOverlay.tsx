import React, { useCallback, useRef, useState } from 'react';
import MediaToggle from '../../controls/media/MediaToggle';
import IconRepeat24 from '../../controls/icons/IconRepeat24';
import { formatTime } from './peaks';
import {
    getRangeHighlightStyle,
    resizeRangeEdge,
    snapTimeToPlayhead,
    timeFromClientX,
    WAVEFORM_SELECTION_NONE,
    WaveformSelection,
} from './selection';
import './WaveformRangeOverlay.scss';

export type WaveformRangeOverlayProps = {
    currentTime?: number;
    durationSec: number;
    hideToolbar?: boolean;
    isLooping?: boolean;
    onLoopChange?: (isLooping: boolean) => void;
    onSelectionChange: (selection: WaveformSelection) => void;
    selection: WaveformSelection;
};

const RANGE_NUDGE_SEC = 0.1;
const RANGE_NUDGE_LARGE_SEC = 1;

function trackMetrics(track: HTMLElement | null): { left: number; width: number } | null {
    if (!track) {
        return null;
    }
    const rect = track.getBoundingClientRect();
    if (!(rect.width > 0)) {
        return null;
    }
    return { left: rect.left, width: rect.width };
}

export default function WaveformRangeOverlay({
    currentTime = 0,
    durationSec,
    hideToolbar = false,
    isLooping = false,
    onLoopChange,
    onSelectionChange,
    selection,
}: WaveformRangeOverlayProps): JSX.Element | null {
    const trackRef = useRef<HTMLDivElement>(null);
    const selectionRef = useRef(selection);
    const currentTimeRef = useRef(currentTime);
    const durationSecRef = useRef(durationSec);
    selectionRef.current = selection;
    currentTimeRef.current = currentTime;
    durationSecRef.current = durationSec;

    const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);

    const style = getRangeHighlightStyle(selection, durationSec);
    const isRange = selection.kind === 'range';

    const timeFromPointer = useCallback((clientX: number): number => {
        const metrics = trackMetrics(trackRef.current);
        if (!metrics) {
            return 0;
        }
        const time = timeFromClientX(clientX, metrics.left, metrics.width, durationSecRef.current);
        return snapTimeToPlayhead(time, currentTimeRef.current, durationSecRef.current, metrics.width);
    }, []);

    const startHandleDrag = useCallback(
        (edge: 'start' | 'end') => (event: React.PointerEvent<HTMLButtonElement>) => {
            if (event.button) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            setDraggingHandle(edge);

            const onMove = (moveEvent: PointerEvent): void => {
                const { current } = selectionRef;
                if (current.kind !== 'range') {
                    return;
                }
                const next = resizeRangeEdge(current, edge, timeFromPointer(moveEvent.clientX), durationSecRef.current);
                if (next) {
                    onSelectionChange({ kind: 'range', ...next });
                }
            };

            const onUp = (): void => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
                setDraggingHandle(null);
            };

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
        },
        [onSelectionChange, timeFromPointer],
    );

    const nudgeHandle = useCallback(
        (edge: 'start' | 'end', deltaSec: number) => {
            const { current } = selectionRef;
            if (current.kind !== 'range') {
                return;
            }
            const time = edge === 'start' ? current.startSec + deltaSec : current.endSec + deltaSec;
            const next = resizeRangeEdge(current, edge, time, durationSecRef.current);
            if (next) {
                onSelectionChange({ kind: 'range', ...next });
            }
        },
        [onSelectionChange],
    );

    const onHandleKeyDown = useCallback(
        (edge: 'start' | 'end') => (event: React.KeyboardEvent<HTMLButtonElement>) => {
            const step = event.shiftKey ? RANGE_NUDGE_LARGE_SEC : RANGE_NUDGE_SEC;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                event.preventDefault();
                nudgeHandle(edge, -step);
                return;
            }
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                event.preventDefault();
                nudgeHandle(edge, step);
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                onSelectionChange(WAVEFORM_SELECTION_NONE);
            }
        },
        [nudgeHandle, onSelectionChange],
    );

    if (!isRange || !style) {
        return null;
    }

    const showToolbar = !hideToolbar && draggingHandle == null;
    const handleTime = draggingHandle === 'start' ? selection.startSec : selection.endSec;

    return (
        <div className="bp-WaveformRangeOverlay" data-testid="bp-waveform-range">
            <div ref={trackRef} className="bp-WaveformRangeOverlay-track">
                <div className="bp-WaveformRangeOverlay-fill" data-testid="bp-waveform-range-fill" style={style}>
                    <button
                        aria-label={__('media_range_start')}
                        aria-valuemax={selection.endSec}
                        aria-valuemin={0}
                        aria-valuenow={selection.startSec}
                        className={`bp-WaveformRangeOverlay-handle bp-WaveformRangeOverlay-handle--start${
                            draggingHandle === 'start' ? ' bp-WaveformRangeOverlay-handle--dragging' : ''
                        }`}
                        data-testid="bp-waveform-range-handle-start"
                        onKeyDown={onHandleKeyDown('start')}
                        onPointerDown={startHandleDrag('start')}
                        role="slider"
                        type="button"
                    />
                    <button
                        aria-label={__('media_range_end')}
                        aria-valuemax={durationSec}
                        aria-valuemin={selection.startSec}
                        aria-valuenow={selection.endSec}
                        className={`bp-WaveformRangeOverlay-handle bp-WaveformRangeOverlay-handle--end${
                            draggingHandle === 'end' ? ' bp-WaveformRangeOverlay-handle--dragging' : ''
                        }`}
                        data-testid="bp-waveform-range-handle-end"
                        onKeyDown={onHandleKeyDown('end')}
                        onPointerDown={startHandleDrag('end')}
                        role="slider"
                        type="button"
                    />
                    {showToolbar && (
                        <div className="bp-WaveformRangeOverlay-toolbar" data-testid="bp-waveform-range-toolbar">
                            <MediaToggle
                                aria-pressed={isLooping}
                                className={`bp-WaveformRangeOverlay-loop${
                                    isLooping ? ' bp-WaveformRangeOverlay-loop--on' : ''
                                }`}
                                data-testid="bp-waveform-range-loop"
                                onClick={() => onLoopChange?.(!isLooping)}
                                title={__('media_repeat_selection')}
                            >
                                <IconRepeat24 />
                            </MediaToggle>
                        </div>
                    )}
                    {draggingHandle != null && (
                        <div
                            className={`bp-WaveformRangeOverlay-handleTime bp-WaveformRangeOverlay-handleTime--${draggingHandle}`}
                            data-testid="bp-waveform-range-time"
                        >
                            {formatTime(handleTime)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
