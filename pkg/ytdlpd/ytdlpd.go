package ytdlpd

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/pkg/errors"
)

type Ytdlpd struct {
	url   string
	token string
}

func New(url string, token string) *Ytdlpd {
	return &Ytdlpd{
		url:   strings.TrimSuffix(url, "/") + "/api/v1/download",
		token: "Bearer " + token,
	}
}

type RequestModel struct {
	Url string `json:"url"`
}

func (t *Ytdlpd) Download(ctx context.Context, url string, out io.Writer) error {
	var buf bytes.Buffer
	err := json.NewEncoder(&buf).Encode(RequestModel{Url: url})
	if err != nil {
		return errors.Wrap(err, "failed to encode request payload")
	}

	req, err := http.NewRequest("POST", t.url, &buf)
	if err != nil {
		return errors.Wrap(err, "failed to create reuqest")
	}

	req.Header.Add("Authorization", t.token)

	if ctx != nil {
		req = req.WithContext(ctx)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("%w: %w", ErrServiceUnreachable, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respErr := &ResponseError{StatusCode: resp.StatusCode}
		// The body might be empty or not JSON, so decoding errors are ignored
		// and only the status code is reported in that case.
		_ = json.NewDecoder(resp.Body).Decode(&respErr.ErrorModel)
		return respErr
	}

	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return errors.Wrap(err, "copying response body failed")
	}

	return nil
}
