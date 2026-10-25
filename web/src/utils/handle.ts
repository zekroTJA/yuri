import type { FormEvent } from "react";

// Matches all characters which are not allowed in sound handles.
const INVALID_HANDLE_CHARACTERS = /[^a-zA-Z0-9_-]/g;

// Removes all characters from the given value which are not allowed in sound
// handles, i.e. everything except alphanumerics, dashes and underscores.
export function sanitizeSoundHandle(value: string): string {
  return value.replace(INVALID_HANDLE_CHARACTERS, "");
}

// Sanitizes the value of a sound handle input on input and restores the
// caret position, which would otherwise jump to the end when the value of the
// controlled input is replaced.
export function onSoundHandleInput(
  event: FormEvent<HTMLInputElement>,
  setHandle: (handle: string) => void,
) {
  const input = event.currentTarget;
  const value = input.value;
  const sanitized = sanitizeSoundHandle(value);

  if (sanitized !== value && input.selectionStart !== null) {
    const caret = sanitizeSoundHandle(
      value.slice(0, input.selectionStart),
    ).length;
    requestAnimationFrame(() => input.setSelectionRange(caret, caret));
  }

  setHandle(sanitized);
}
