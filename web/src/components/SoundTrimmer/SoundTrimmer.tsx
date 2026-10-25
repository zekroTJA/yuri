import { useEffect, useRef, useState, type PointerEvent } from "react";
import styles from "./SoundTrimmer.module.css";
import { API_CLIENT } from "../../services/apiclient";
import { getGain } from "../../services/soundplayer";
import { errorMessage } from "../../utils/errors";
import Button from "../Button/Button";
import Input from "../Input/Input";
import ErrorTile from "../ErrorTile/ErrorTile";

export type TrimRange = {
  start: number;
  end: number;
};

// Called with the selected range in seconds, or undefined when the whole
// sound is selected and nothing has to be trimmed.
export type TrimRangeChangeCallback = (range: TrimRange | undefined) => void;

type TrimHandle = "start" | "end";

type Props = {
  soundId: number;
  onChange: TrimRangeChangeCallback;
};

// Minimum length of the selected range in seconds.
const minRangeLength = 0.05;
// Tolerance in seconds below which a range edge counts as untrimmed.
const untrimmedTolerance = 0.001;

const waveformWidth = 800;
const waveformHeight = 120;

export default function SoundTrimmer({ soundId, onChange }: Props) {
  const [buffer, setBuffer] = useState<AudioBuffer | undefined>();
  const [range, setRange] = useState<TrimRange>({ start: 0, end: 0 });
  const [playhead, setPlayhead] = useState<number | undefined>();
  const [error, setError] = useState<string | undefined>();

  const audioContextRef = useRef<AudioContext | undefined>(undefined);
  const sourceRef = useRef<AudioBufferSourceNode | undefined>(undefined);
  const animationFrameRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggedHandleRef = useRef<TrimHandle | undefined>(undefined);

  const duration = buffer?.duration ?? 0;
  const isPlaying = playhead !== undefined;

  useEffect(() => {
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    let cancelled = false;
    API_CLIENT.getSound(soundId)
      .then((blob) => blob.arrayBuffer())
      .then((data) => audioContext.decodeAudioData(data))
      .then((decoded) => {
        if (cancelled) return;
        setBuffer(decoded);
        setRange({ start: 0, end: decoded.duration });
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameRef.current);
      sourceRef.current = undefined;
      audioContextRef.current = undefined;
      audioContext.close();
    };
  }, [soundId]);

  useEffect(() => {
    if (buffer && canvasRef.current) drawWaveform(canvasRef.current, buffer);
  }, [buffer]);

  const updateRange = (newRange: TrimRange) => {
    setRange(newRange);
    const isUntrimmed =
      newRange.start <= untrimmedTolerance &&
      newRange.end >= duration - untrimmedTolerance;
    onChange(isUntrimmed ? undefined : newRange);
  };

  const moveHandle = (handle: TrimHandle, time: number) => {
    if (handle == "start") {
      updateRange({
        start: clamp(time, 0, range.end - minRangeLength),
        end: range.end,
      });
    } else {
      updateRange({
        start: range.start,
        end: clamp(time, range.start + minRangeLength, duration),
      });
    }
  };

  const timeAtPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return clamp((e.clientX - rect.left) / rect.width, 0, 1) * duration;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!buffer) return;
    const time = timeAtPointer(e);
    const handle: TrimHandle =
      Math.abs(time - range.start) <= Math.abs(time - range.end)
        ? "start"
        : "end";
    draggedHandleRef.current = handle;
    e.currentTarget.setPointerCapture(e.pointerId);
    moveHandle(handle, time);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (draggedHandleRef.current) {
      moveHandle(draggedHandleRef.current, timeAtPointer(e));
    }
  };

  const onPointerUp = () => {
    draggedHandleRef.current = undefined;
  };

  const stopPreview = () => {
    cancelAnimationFrame(animationFrameRef.current);
    const source = sourceRef.current;
    sourceRef.current = undefined;
    source?.stop();
    setPlayhead(undefined);
  };

  const startPreview = async () => {
    const audioContext = audioContextRef.current;
    if (!buffer || !audioContext) return;

    stopPreview();
    // The context starts suspended when it was created without a user
    // gesture, so it has to be resumed on the first preview.
    await audioContext.resume();

    const gain = audioContext.createGain();
    gain.gain.value = getGain();
    gain.connect(audioContext.destination);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    source.addEventListener("ended", () => {
      if (sourceRef.current === source) stopPreview();
    });

    const { start, end } = range;
    const startedAt = audioContext.currentTime;
    source.start(0, start, end - start);
    sourceRef.current = source;

    const updatePlayhead = () => {
      setPlayhead(Math.min(start + audioContext.currentTime - startedAt, end));
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    };
    updatePlayhead();
  };

  const onTimeInput = (handle: TrimHandle, value: number) => {
    if (Number.isFinite(value)) moveHandle(handle, value);
  };

  if (error) return <ErrorTile message={error} />;
  if (!buffer) return <span className={styles.loading}>Loading sound...</span>;

  const toPercent = (time: number) => `${(time / duration) * 100}%`;

  return (
    <div className={styles.trimmer}>
      <div
        className={styles.waveform}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          width={waveformWidth}
          height={waveformHeight}
        />
        <div
          className={styles.cutoff}
          style={{ left: 0, width: toPercent(range.start) }}
        />
        <div
          className={styles.cutoff}
          style={{ left: toPercent(range.end), right: 0 }}
        />
        <div
          className={styles.handle}
          style={{ left: toPercent(range.start) }}
        />
        <div className={styles.handle} style={{ left: toPercent(range.end) }} />
        {isPlaying && (
          <div
            className={styles.playhead}
            style={{ left: toPercent(playhead) }}
          />
        )}
      </div>
      <div className={styles.controls}>
        <label className={styles.time}>
          <span>Start</span>
          <Input
            type="number"
            min={0}
            max={duration}
            step={0.01}
            value={roundTime(range.start)}
            onChange={(e) =>
              onTimeInput("start", e.currentTarget.valueAsNumber)
            }
          />
        </label>
        <label className={styles.time}>
          <span>End</span>
          <Input
            type="number"
            min={0}
            max={duration}
            step={0.01}
            value={roundTime(range.end)}
            onChange={(e) => onTimeInput("end", e.currentTarget.valueAsNumber)}
          />
        </label>
        <span className={styles.length}>
          {formatTime(range.end - range.start)} of {formatTime(duration)}
        </span>
        <div className={styles.buttons}>
          <Button
            onClick={() => updateRange({ start: 0, end: duration })}
            disabled={range.start == 0 && range.end == duration}
          >
            Reset
          </Button>
          <Button onClick={isPlaying ? stopPreview : startPreview}>
            {isPlaying ? "Stop" : "Preview"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function drawWaveform(canvas: HTMLCanvasElement, buffer: AudioBuffer) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const { width, height } = canvas;
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) =>
    buffer.getChannelData(i),
  );
  const samplesPerColumn = buffer.length / width;

  context.clearRect(0, 0, width, height);
  context.fillStyle = getComputedStyle(canvas).color;

  for (let x = 0; x < width; x++) {
    const from = Math.floor(x * samplesPerColumn);
    const to = Math.max(from + 1, Math.floor((x + 1) * samplesPerColumn));
    let peak = 0;
    for (const data of channels) {
      for (let i = from; i < to && i < data.length; i++) {
        peak = Math.max(peak, Math.abs(data[i]));
      }
    }
    const barHeight = Math.max(1, Math.min(peak, 1) * height);
    context.fillRect(x, (height - barHeight) / 2, 1, barHeight);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundTime(seconds: number): number {
  return Math.round(seconds * 100) / 100;
}

function formatTime(seconds: number): string {
  return `${seconds.toFixed(2)}s`;
}
