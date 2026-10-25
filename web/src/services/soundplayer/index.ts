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

const volumeStorageKey = "volume";
const defaultVolume = 0.5;

let volume = loadVolume();

function loadVolume(): number {
  const stored = localStorage.getItem(volumeStorageKey);
  if (stored === null) return defaultVolume;
  const parsed = Number(stored);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, 0), 1)
    : defaultVolume;
}

// Returns the output volume of played sounds in the range of 0 to 1.
export function getVolume(): number {
  return volume;
}

// Sets the output volume of played sounds in the range of 0 to 1. The value
// is persisted and applied to currently playing sounds as well.
export function setVolume(newVolume: number): void {
  volume = Math.min(Math.max(newVolume, 0), 1);
  localStorage.setItem(volumeStorageKey, String(volume));
  if (currentPlayback?.audio) currentPlayback.audio.volume = volume;
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
    audio.volume = volume;
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
