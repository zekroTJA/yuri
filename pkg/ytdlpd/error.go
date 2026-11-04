package ytdlpd

import (
	"errors"
	"fmt"

	"github.com/zekrotja/yuri/pkg/ytdlp"
)

type ErrorCode string

const (
	ErrorUnauthorized            = ErrorCode("unauthorized")
	ErrorCheckingAuthToken       = ErrorCode("auth-check-token")
	ErrorDecodingRequestPayload  = ErrorCode("payload-decoding")
	ErrorMissingUrl              = ErrorCode("payload-missing-url")
	ErrorAgeVerificationRequired = ErrorCode("age-verification-required")
	ErrorDownloadFailed          = ErrorCode("download-failed")
)

// ErrServiceUnreachable is returned when the request to the ytdlpd service
// could not be performed.
var ErrServiceUnreachable = errors.New("ytdlpd service is unreachable")

type ErrorModel struct {
	Code    ErrorCode `json:"code"`
	Message string    `json:"message,omitzero"`
}

// ResponseError is returned when the ytdlpd service responds with a non-200
// status code. Code and Message are empty if the response body could not be
// decoded as ErrorModel.
type ResponseError struct {
	ErrorModel

	StatusCode int
}

func (t *ResponseError) Error() string {
	if t.Code == "" {
		return fmt.Sprintf("ytdlpd request failed with status %d", t.StatusCode)
	}
	return fmt.Sprintf("ytdlpd request failed with status %d: <%s> %s",
		t.StatusCode, t.Code, t.Message)
}

// Unwrap maps error codes which have an equivalent error in the ytdlp package
// to that error, so that both downloaders can be handled the same way via
// errors.Is.
func (t *ResponseError) Unwrap() error {
	switch t.Code {
	case ErrorAgeVerificationRequired:
		return ytdlp.ErrAgeVerificationRequired
	default:
		return nil
	}
}
