import type { FormEvent } from "react";
import type { ChannelResponse, SoundResponse } from "../services/apiclient";
import { onSanitizedInput } from "./input";

// Matches all characters which are neither allowed in tags nor used to
// separate them in a comma separated list of tags.
const INVALID_TAGS_INPUT_CHARACTERS = /[^a-z0-9_,\- ]/g;

// Matches all spaces which do not directly follow a separating comma.
const MISPLACED_SPACES = /(?<!,) +/g;

// Sanitizes a comma separated list of tags so that each tag only consists of
// lowercase alphanumerics, dashes and underscores. Uppercase letters are
// converted to lowercase and a single space is allowed after each comma.
export function sanitizeTagsInput(value: string): string {
  return value
    .toLowerCase()
    .replace(INVALID_TAGS_INPUT_CHARACTERS, "")
    .replace(MISPLACED_SPACES, "");
}

// Sanitizes the value of a comma separated tags input on input.
export function onTagsInput(
  event: FormEvent<HTMLInputElement>,
  setTags: (tags: string) => void,
) {
  onSanitizedInput(event, sanitizeTagsInput, setTags);
}

// Splits a comma separated list of tags and removes empty entries.
export function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter((t) => !!t);
}

// Returns true when the sound has a tag which is contained in the tag
// blocklist of the channel.
export function isSoundBlocked(
  sound: SoundResponse,
  channel: ChannelResponse | undefined,
): boolean {
  const blocklist = channel?.tag_blocklist;
  if (!blocklist?.length) return false;
  return !!sound.tags?.some((t) => blocklist.includes(t));
}
