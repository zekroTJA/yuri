package api

// ErrorResponse is the JSON body returned for all API error responses.
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

var (
	ErrInternal = ErrorResponse{Code: "internal", Message: "Internal server error"}

	ErrInvalidRequestBody = ErrorResponse{Code: "invalid_request_body", Message: "Invalid request body"}
	ErrInvalidID          = ErrorResponse{Code: "invalid_id", Message: "Invalid ID"}
	ErrInvalidInviteID    = ErrorResponse{Code: "invalid_invite_id", Message: "Invalid invite ID"}
	ErrForbidden          = ErrorResponse{Code: "forbidden", Message: "Forbidden"}
	ErrUnauthorized       = ErrorResponse{Code: "unauthorized", Message: "Unauthorized"}
	ErrNotFound           = ErrorResponse{Code: "not_found", Message: "Not found"}

	ErrPasswordTooShort   = ErrorResponse{Code: "password_too_short", Message: "Password must be at least 6 characters"}
	ErrHandleConflict     = ErrorResponse{Code: "handle_conflict", Message: "Handle is already in use"}
	ErrInvalidCredentials = ErrorResponse{Code: "invalid_credentials", Message: "Invalid username or password"}

	ErrInvalidScope   = ErrorResponse{Code: "invalid_scope", Message: "Invalid scope"}
	ErrAPIKeyNotFound = ErrorResponse{Code: "api_key_not_found", Message: "API key not found"}

	ErrInvalidExpiresAt = ErrorResponse{Code: "invalid_expires_at", Message: "Expiration date must be in the future"}
	ErrChannelNotFound  = ErrorResponse{Code: "channel_not_found", Message: "Channel not found"}
	ErrInviteNotFound   = ErrorResponse{Code: "invite_not_found", Message: "Invite not found"}
	ErrInvalidCode      = ErrorResponse{Code: "invalid_code", Message: "Invalid code"}
	ErrInviteExpired    = ErrorResponse{Code: "invite_expired", Message: "Invite expired"}
	ErrInviteExhausted  = ErrorResponse{Code: "invite_exhausted", Message: "Invite has no remaining activations"}

	ErrHandleRequired    = ErrorResponse{Code: "handle_required", Message: "Handle is required"}
	ErrInvalidFilter     = ErrorResponse{Code: "invalid_filter", Message: "Invalid filter"}
	ErrFileRequired      = ErrorResponse{Code: "file_required", Message: "File or URL is required"}
	ErrFileAndURL        = ErrorResponse{Code: "file_and_url", Message: "Only one of file or URL must be provided"}
	ErrInvalidURL        = ErrorResponse{Code: "invalid_url", Message: "URL must be a valid http or https URL"}
	ErrDownloadFailed    = ErrorResponse{Code: "download_failed", Message: "Failed to download media from URL"}
	ErrYtdlpNotInstalled = ErrorResponse{Code: "ytdlp_not_installed", Message: "Downloading from URLs is not available because yt-dlp is not installed"}
	ErrSoundEncodeFailed = ErrorResponse{Code: "sound_encode_failed", Message: "Failed to encode file"}
	ErrSoundNotFound     = ErrorResponse{Code: "sound_not_found", Message: "Sound not found"}
	ErrInvalidHandle     = ErrorResponse{Code: "invalid_handle", Message: "Handle must not contain path separators"}
	ErrInvalidArchive    = ErrorResponse{Code: "invalid_archive", Message: "Invalid sound archive"}

	ErrAlreadyConnected = ErrorResponse{Code: "already_connected", Message: "Already connected"}
	ErrNotConnected     = ErrorResponse{Code: "not_connected", Message: "You need to be connected to a channel to perform this action"}
)
