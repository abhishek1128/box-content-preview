import React, { useCallback, useEffect, useState } from 'react';
import isFinite from 'lodash/isFinite';
import { Props as DurationLabelsProps } from '../controls/media/DurationLabels';
import MediaSettings, { Props as MediaSettingsProps } from '../controls/media/MediaSettings';
import PlayPauseToggle, { Props as PlayControlsProps } from '../controls/media/PlayPauseToggle';
import { Props as TimeControlsProps } from '../controls/media/TimeControls';
import TimestampControl from '../controls/media/TimestampControl';
import VolumeControls, { Props as VolumeControlsProps } from '../controls/media/VolumeControls';
import { ICON_PLAY_LARGE } from '../../icons';
import { PLACEHOLDER_DURATION_SEC, placeholderPeaks } from './waveform/peaks';
import { isTimeInRange, WAVEFORM_SELECTION_NONE, WaveformSelection } from './waveform/selection';
import WaveformRangeOverlay from './waveform/WaveformRangeOverlay';
import WaveformView from './waveform/WaveformView';
import './MP3ControlsV2.scss';

const PLACEHOLDER_PEAKS = placeholderPeaks();

export type Props = DurationLabelsProps &
    MediaSettingsProps &
    PlayControlsProps &
    Pick<TimeControlsProps, 'onTimeChange'> &
    VolumeControlsProps & {
        bufferedRange?: TimeRanges;
        mediaEl?: HTMLMediaElement | null;
        onLoopChange?: (isLooping: boolean) => void;
        onSelectionChange?: (selection: WaveformSelection) => void;
        peaks?: ArrayLike<number>;
    };

export default function MP3ControlsV2({
    autoplay,
    bufferedRange,
    currentTime,
    durationTime,
    isPlaying,
    mediaEl,
    onAutoplayChange,
    onLoopChange,
    onMuteChange,
    onPlayPause,
    onRateChange,
    onSelectionChange,
    onTimeChange,
    onVolumeChange,
    peaks,
    rate,
    volume,
}: Props): JSX.Element {
    const durationValue = typeof durationTime === 'number' && isFinite(durationTime) ? durationTime : 0;
    const hasRealPeaks = !!(peaks && peaks.length);
    const waveformPeaks = hasRealPeaks ? peaks : PLACEHOLDER_PEAKS;
    const hasMetadata = durationValue > 0;
    const waveformDurationSec = hasMetadata ? durationValue : PLACEHOLDER_DURATION_SEC;
    const [playRequested, setPlayRequested] = useState(false);
    const [selection, setSelection] = useState<WaveformSelection>(WAVEFORM_SELECTION_NONE);
    const [isLooping, setIsLooping] = useState(false);
    const [isRangeDraft, setIsRangeDraft] = useState(false);

    useEffect(() => {
        if (isPlaying) {
            setPlayRequested(true);
        }
    }, [isPlaying]);

    const publishSelection = useCallback(
        (next: WaveformSelection) => {
            setSelection(next);
            onSelectionChange?.(next);
            if (next.kind !== 'range') {
                setIsLooping(false);
                onLoopChange?.(false);
            }
        },
        [onLoopChange, onSelectionChange],
    );

    const handlePlayOverlayClick = useCallback(() => {
        setPlayRequested(true);
        onPlayPause(true);
    }, [onPlayPause]);

    const handleSeek = useCallback(
        (timeSec: number) => {
            if (isTimeInRange(selection, timeSec)) {
                onTimeChange(timeSec);
                return;
            }
            if (selection.kind === 'range') {
                setIsRangeDraft(false);
                publishSelection(WAVEFORM_SELECTION_NONE);
            }
            onTimeChange(timeSec);
        },
        [onTimeChange, publishSelection, selection],
    );

    const handleRangeChange = useCallback(
        (range: { startSec: number; endSec: number }, isDraft: boolean) => {
            setIsRangeDraft(isDraft);
            publishSelection({ kind: 'range', ...range });
        },
        [publishSelection],
    );

    const handleOverlaySelectionChange = useCallback(
        (next: WaveformSelection) => {
            setIsRangeDraft(false);
            publishSelection(next);
        },
        [publishSelection],
    );

    const handleLoopChange = useCallback(
        (next: boolean) => {
            setIsLooping(next);
            onLoopChange?.(next);
        },
        [onLoopChange],
    );

    const isWaveformInteractive = playRequested && hasMetadata;
    const isWaitingToPlay = playRequested && !hasMetadata;
    const showPlayOverlay = !playRequested && !isPlaying;

    return (
        <div className="bp-MP3ControlsV2" data-testid="media-controls-wrapper-v2">
            <div className="bp-MP3ControlsV2-stage">
                <div className="bp-MP3ControlsV2-waveform">
                    <WaveformView
                        bufferedRange={bufferedRange}
                        currentTime={currentTime}
                        durationSec={waveformDurationSec}
                        interactive={isWaveformInteractive}
                        mediaEl={mediaEl}
                        onRangeChange={isWaveformInteractive ? handleRangeChange : undefined}
                        onSeek={isWaveformInteractive ? handleSeek : undefined}
                        peaks={waveformPeaks}
                    />
                    {isWaveformInteractive && (
                        <WaveformRangeOverlay
                            currentTime={currentTime}
                            durationSec={waveformDurationSec}
                            hideToolbar={isRangeDraft}
                            isLooping={isLooping}
                            onLoopChange={handleLoopChange}
                            onSelectionChange={handleOverlaySelectionChange}
                            selection={selection}
                        />
                    )}
                </div>
                {showPlayOverlay && (
                    <button
                        className="bp-MP3ControlsV2-playOverlay"
                        // Static SVG from the icons module, same asset video uses for the overlay.
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: ICON_PLAY_LARGE }}
                        data-testid="bp-MP3ControlsV2-play-overlay"
                        onClick={handlePlayOverlayClick}
                        title={__('media_play')}
                        type="button"
                    />
                )}
                {isWaitingToPlay && (
                    <div className="bp-media-buffering-spinner" data-testid="bp-MP3ControlsV2-loading" />
                )}
            </div>
            {hasMetadata && (
                <div className="bp-MP3ControlsV2-bar" data-testid="bp-MP3ControlsV2-bar">
                    <div className="bp-MP3ControlsV2-group">
                        <PlayPauseToggle hasSkipButtons={false} isPlaying={isPlaying} onPlayPause={onPlayPause} />
                        <div className="bp-MP3ControlsV2-divider" />
                        <TimestampControl currentTime={currentTime} durationTime={durationValue} />
                    </div>

                    <div className="bp-MP3ControlsV2-group">
                        <VolumeControls onMuteChange={onMuteChange} onVolumeChange={onVolumeChange} volume={volume} />
                        <MediaSettings
                            autoplay={autoplay}
                            className="bp-MP3Controls-settings"
                            onAutoplayChange={onAutoplayChange}
                            onRateChange={onRateChange}
                            rate={rate}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
