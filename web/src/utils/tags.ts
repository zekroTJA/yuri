import type { ChannelResponse, SoundResponse } from "../services/apiclient";

// Matches the characters which separate entered tags.
export const TAG_SEPARATORS = /[ ,]/;

// Matches all characters which are not allowed in tags.
const INVALID_TAG_CHARACTERS = /[^a-z0-9_-]/g;

// Sanitizes a single tag so that it only consists of lowercase alphanumerics,
// dashes and underscores. Uppercase letters are converted to lowercase.
export function sanitizeTag(value: string): string {
  return value.toLowerCase().replace(INVALID_TAG_CHARACTERS, "");
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
