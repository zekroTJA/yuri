import { API_CLIENT } from "../apiclient";

// Object URLs of already downloaded sound files keyed by sound ID, so that
// repeatedly played sounds are only fetched once.
const objectUrls = new Map<number, Promise<string>>();

type Playback = {
  audio?: HTMLAudioElement;
  stop: () => void;
};

// The currently active playback. Only one sound is played at a time, so
// starting a new sound stops the current one. It is also used to apply volume
// changes to the sound which is already playing.
let currentPlayback: Playback | undefined;

const volumeStorageKey = "volume-level";
// Previously, the volume was stored as linear gain under this key. It is
// converted to a volume level when no volume level has been stored yet.
const legacyVolumeStorageKey = "volume";
const defaultVolume = 0.5;
// The attenuation in decibels at the lowest volume level above 0. Volume
// levels are mapped linearly onto this decibel range, so that the volume
// slider behaves logarithmically, which matches the perceived loudness.
const volumeRangeDb = 40;

let volume = loadVolume();

function clampVolume(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function loadVolume(): number {
  const stored = localStorage.getItem(volumeStorageKey);
  if (stored !== null) {
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? clampVolume(parsed) : defaultVolume;
  }

  const legacyStored = localStorage.getItem(legacyVolumeStorageKey);
  if (legacyStored !== null) {
    const parsed = Number(legacyStored);
    if (Number.isFinite(parsed)) return gainToVolume(clampVolume(parsed));
  }

  return defaultVolume;
}

// Converts a volume level in the range of 0 to 1 to a linear gain in the
// range of 0 to 1.
function volumeToGain(volumeLevel: number): number {
  if (volumeLevel <= 0) return 0;
  return Math.pow(10, ((volumeLevel - 1) * volumeRangeDb) / 20);
}

// Converts a linear gain in the range of 0 to 1 to a volume level in the
// range of 0 to 1.
function gainToVolume(gain: number): number {
  if (gain <= 0) return 0;
  return clampVolume(1 + (20 * Math.log10(gain)) / volumeRangeDb);
}

// Returns the volume level of played sounds in the range of 0 to 1 as shown
// on the volume slider.
export function getVolume(): number {
  return volume;
}

// Returns the linear gain in the range of 0 to 1 which has to be applied to
// played sounds for the current volume level.
export function getGain(): number {
  return volumeToGain(volume);
}

// Sets the volume level of played sounds in the range of 0 to 1. The value
// is persisted and applied to currently playing sounds as well.
export function setVolume(newVolume: number): void {
  volume = clampVolume(newVolume);
  localStorage.setItem(volumeStorageKey, String(volume));
  if (currentPlayback?.audio) currentPlayback.audio.volume = getGain();
}

function getObjectUrl(soundId: number): Promise<string> {
  let objectUrl = objectUrls.get(soundId);
  if (!objectUrl) {
    objectUrl = API_CLIENT.getSound(soundId).then((blob) =>
      URL.createObjectURL(blob),
    );
    objectUrl.catch(() => objectUrls.delete(soundId));
    objectUrls.set(soundId, objectUrl);
  }
  return objectUrl;
}

// Plays the sound with the given ID and stops the currently playing sound, if
// any. The returned promise resolves when the playback has finished, has been
// stopped by another sound or could not be started.
export async function playSound(soundId: number): Promise<void> {
  let stopped = false;
  let resolvePlayback: () => void = () => {};
  const playback: Playback = {
    stop: () => {
      stopped = true;
      playback.audio?.pause();
      resolvePlayback();
    },
  };

  currentPlayback?.stop();
  currentPlayback = playback;

  try {
    const objectUrl = await getObjectUrl(soundId);
    // Another sound might have been started while the file was downloaded.
    if (stopped) return;

    const audio = new Audio(objectUrl);
    audio.volume = getGain();
    playback.audio = audio;
    await new Promise<void>((resolve) => {
      resolvePlayback = resolve;
      audio.addEventListener("ended", () => resolve());
      audio.addEventListener("error", () => resolve());
      audio.play().catch((e) => {
        if (!stopped) console.error("failed playing sound", soundId, e);
        resolve();
      });
    });
  } finally {
    if (currentPlayback === playback) currentPlayback = undefined;
  }
}

// Drops the cached file of the given sound, e.g. after it has been deleted.
export function evictSound(soundId: number): void {
  const objectUrl = objectUrls.get(soundId);
  if (!objectUrl) return;
  objectUrls.delete(soundId);
  objectUrl.then((url) => URL.revokeObjectURL(url)).catch(() => {});
}
