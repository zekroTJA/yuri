package api

import (
	"context"
	"io"
)

type Downlaoder interface {
	Download(ctx context.Context, url string, out io.Writer) error
}
