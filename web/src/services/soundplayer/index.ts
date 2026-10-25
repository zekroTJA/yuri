import { API_CLIENT } from "../apiclient";

// Object URLs of already downloaded sound files keyed by sound ID, so that
// repeatedly played sounds are only fetched once.
const objectUrls = new Map<number, Promise<string>>();

// Currently playing audio elements, so that volume changes also apply to
// sounds which are already playing.
const playingAudios = new Set<HTMLAudioElement>();

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
  playingAudios.forEach((audio) => (audio.volume = volume));
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

// Plays the sound with the given ID. The returned promise resolves when the
// playback has finished or could not be started.
export async function playSound(soundId: number): Promise<void> {
  const audio = new Audio(await getObjectUrl(soundId));
  audio.volume = volume;
  playingAudios.add(audio);
  await new Promise<void>((resolve) => {
    audio.addEventListener("ended", () => resolve());
    audio.addEventListener("error", () => resolve());
    audio.play().catch((e) => {
      console.error("failed playing sound", soundId, e);
      resolve();
    });
  });
  playingAudios.delete(audio);
}

// Drops the cached file of the given sound, e.g. after it has been deleted.
export function evictSound(soundId: number): void {
  const objectUrl = objectUrls.get(soundId);
  if (!objectUrl) return;
  objectUrls.delete(soundId);
  objectUrl.then((url) => URL.revokeObjectURL(url)).catch(() => {});
}
