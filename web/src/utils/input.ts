import type { FormEvent } from "react";

// Sanitizes the value of an input on input and restores the caret position,
// which would otherwise jump to the end when the value of the controlled
// input is replaced. The sanitize function must map each prefix of a value to
// the prefix of the sanitized value, so that the caret can be mapped as well.
export function onSanitizedInput(
  event: FormEvent<HTMLInputElement>,
  sanitize: (value: string) => string,
  setValue: (value: string) => void,
) {
  const input = event.currentTarget;
  const value = input.value;
  const sanitized = sanitize(value);

  if (sanitized !== value && input.selectionStart !== null) {
    const caret = sanitize(value.slice(0, input.selectionStart)).length;
    requestAnimationFrame(() => input.setSelectionRange(caret, caret));
  }

  setValue(sanitized);
}
