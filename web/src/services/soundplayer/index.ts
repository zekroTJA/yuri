import { API_CLIENT } from "../apiclient";

// Object URLs of already downloaded sound files keyed by sound ID, so that
// repeatedly played sounds are only fetched once.
const objectUrls = new Map<number, Promise<string>>();

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
  await new Promise<void>((resolve) => {
    audio.addEventListener("ended", () => resolve());
    audio.addEventListener("error", () => resolve());
    audio.play().catch((e) => {
      console.error("failed playing sound", soundId, e);
      resolve();
    });
  });
}

// Drops the cached file of the given sound, e.g. after it has been deleted.
export function evictSound(soundId: number): void {
  const objectUrl = objectUrls.get(soundId);
  if (!objectUrl) return;
  objectUrls.delete(soundId);
  objectUrl.then((url) => URL.revokeObjectURL(url)).catch(() => {});
}
