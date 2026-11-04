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
		return errors.Wrap(err, "request failed")
	}

	if resp.StatusCode != 200 {
		var errResp ErrorModel
		err := json.NewDecoder(resp.Body).Decode(&errResp)
		var msg string
		if err == nil {
			msg = fmt.Sprintf(": <%s> %s", errResp.Code, errResp.Message)
		}
		return fmt.Errorf("request failed with status %d%s", resp.StatusCode, msg)
	}

	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return errors.Wrap(err, "copying response body failed")
	}

	return nil
}
