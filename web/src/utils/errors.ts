import { ApiError } from "../services/apiclient";

// Returns a message for the given error which can be displayed to the user.
// Only client errors carry messages meant for the user, everything else is
// logged and replaced by a generic message.
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status < 500) {
    return error.message;
  }
  console.error(error);
  return "An unexpected error occured";
}
