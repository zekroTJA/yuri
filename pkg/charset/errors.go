package charset

import "errors"

var (
	ErrEmptyInput    = errors.New("empty input")
	ErrInvalidRange  = errors.New("invalid range")
	ErrInvalidEscape = errors.New("invalid escape character")
)
