package ytdlpd

type ErrorCode string

const (
	ErrorCheckingAuthToken       = ErrorCode("auth-check-token")
	ErrorDecodingRequestPayload  = ErrorCode("payload-decoding")
	ErrorMissingUrl              = ErrorCode("payload-missing-url")
	ErrorAgeVerificationRequired = ErrorCode("age-verification-required")
	ErrorDownloadFailed          = ErrorCode("download-failed")
)

type ErrorModel struct {
	Code    ErrorCode `json:"code"`
	Message string    `json:"message,omitzero"`
}
