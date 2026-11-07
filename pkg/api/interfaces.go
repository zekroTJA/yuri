package api

import (
	"context"
	"io"
)

type Downloader interface {
	Download(ctx context.Context, url string, out io.Writer) error
}
