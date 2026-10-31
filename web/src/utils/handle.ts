import type { FormEvent } from "react";
import { onSanitizedInput } from "./input";

// Matches all characters which are not allowed in sound handles.
const INVALID_HANDLE_CHARACTERS = /[^a-zA-Z0-9_-]/g;

// Removes all characters from the given value which are not allowed in sound
// handles, i.e. everything except alphanumerics, dashes and underscores.
export function sanitizeSoundHandle(value: string): string {
  return value.replace(INVALID_HANDLE_CHARACTERS, "");
}

// Sanitizes the value of a sound handle input on input.
export function onSoundHandleInput(
  event: FormEvent<HTMLInputElement>,
  setHandle: (handle: string) => void,
) {
  onSanitizedInput(event, sanitizeSoundHandle, setHandle);
}
