import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import WaveformRangeOverlay from '../WaveformRangeOverlay';

function dispatchWindowPointer(type: string, clientX: number): void {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
        button: { value: 0 },
        clientX: { value: clientX },
    });
    window.dispatchEvent(event);
}

describe('WaveformRangeOverlay', () => {
    const range = { endSec: 6, kind: 'range' as const, startSec: 2 };

    beforeEach(() => {
        jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            bottom: 152,
            height: 152,
            left: 0,
            right: 200,
            toJSON: () => ({}),
            top: 0,
            width: 200,
            x: 0,
            y: 0,
        });
    });

    test('should not render when there is no range', () => {
        const { container } = render(
            <WaveformRangeOverlay durationSec={8} onSelectionChange={jest.fn()} selection={{ kind: 'none' }} />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    test('should draw the fill, edge handles, and a centered loop control', () => {
        render(<WaveformRangeOverlay durationSec={8} onSelectionChange={jest.fn()} selection={range} />);

        expect(screen.getByTestId('bp-waveform-range-fill')).toHaveStyle({ left: '25%', width: '50%' });
        expect(screen.getByTestId('bp-waveform-range-handle-start')).toBeInTheDocument();
        expect(screen.getByTestId('bp-waveform-range-handle-end')).toBeInTheDocument();
        expect(screen.getByTestId('bp-waveform-range-loop')).toHaveAttribute('title', __('media_repeat_selection'));
        expect(screen.getByTestId('bp-waveform-range-toolbar')).toBeInTheDocument();
    });

    test('should hide the loop toolbar while a range is still being created', () => {
        render(<WaveformRangeOverlay durationSec={8} hideToolbar onSelectionChange={jest.fn()} selection={range} />);

        expect(screen.getByTestId('bp-waveform-range-fill')).toBeInTheDocument();
        expect(screen.queryByTestId('bp-waveform-range-toolbar')).not.toBeInTheDocument();
    });

    test('should toggle looping from the range toolbar', () => {
        const onLoopChange = jest.fn();
        render(
            <WaveformRangeOverlay
                durationSec={8}
                isLooping={false}
                onLoopChange={onLoopChange}
                onSelectionChange={jest.fn()}
                selection={range}
            />,
        );

        fireEvent.click(screen.getByTestId('bp-waveform-range-loop'));

        expect(onLoopChange).toHaveBeenCalledWith(true);
    });

    test('should resize the range from an edge handle', () => {
        const onSelectionChange = jest.fn();
        render(<WaveformRangeOverlay durationSec={8} onSelectionChange={onSelectionChange} selection={range} />);

        fireEvent.pointerDown(screen.getByTestId('bp-waveform-range-handle-end'), { button: 0, clientX: 150 });
        act(() => {
            dispatchWindowPointer('pointermove', 175);
            dispatchWindowPointer('pointerup', 175);
        });

        expect(onSelectionChange).toHaveBeenCalledWith({ endSec: 7, kind: 'range', startSec: 2 });
        expect(screen.queryByTestId('bp-waveform-range-toolbar')).toBeInTheDocument();
    });

    test('should nudge a handle from the keyboard', () => {
        const onSelectionChange = jest.fn();
        render(<WaveformRangeOverlay durationSec={8} onSelectionChange={onSelectionChange} selection={range} />);

        fireEvent.keyDown(screen.getByTestId('bp-waveform-range-handle-start'), { key: 'ArrowRight' });

        expect(onSelectionChange).toHaveBeenCalledWith({ endSec: 6, kind: 'range', startSec: 2.1 });
    });
});
