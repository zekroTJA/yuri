import { ApiError } from "../services/apiclient";

// Codes of server errors (status >= 500) which carry a message meant for the
// user, e.g. because they point to a misconfiguration which the user should
// report to the administrator.
const userFacingServerErrorCodes = new Set([
  "ytdlp_not_installed",
  "download_service_failed",
]);

// Returns a message for the given error which can be displayed to the user.
// Only client errors and the server errors listed above carry messages meant
// for the user, everything else is logged and replaced by a generic message.
export function errorMessage(error: unknown): string {
  if (
    error instanceof ApiError &&
    (error.status < 500 || userFacingServerErrorCodes.has(error.code))
  ) {
    return error.message;
  }
  console.error(error);
  return "An unexpected error occured";
}
