package ytdlp

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os/exec"
	"strings"
)

// audioFormat prefers audio-only streams in a container which can be
// demuxed by ffmpeg from a non-seekable pipe and falls back to the best
// combined stream if no audio-only stream is available.
const audioFormat = "bestaudio[ext=webm]/bestaudio/best"

const maxFileSize = "100M"

var ErrNotInstalled = errors.New("yt-dlp executable was not found")

type YtDlp struct {
	ytdlpExec string
}

// New creates a new YtDlp instance. If ytdlpExec is empty, the executable is
// resolved via PATH. A missing executable does not fail the creation; instead,
// ErrNotInstalled is returned when Download is called.
func New(ytdlpExec string) (*YtDlp, error) {
	if ytdlpExec == "" {
		ytdlpExec, _ = exec.LookPath("yt-dlp")
	}

	if ytdlpExec == "" {
		return nil, ErrNotInstalled
	}

	return &YtDlp{ytdlpExec: ytdlpExec}, nil
}

// Download downloads the audio of the media behind the given URL and writes
// it to out.
func (t *YtDlp) Download(ctx context.Context, url string, out io.Writer) error {
	cmdArgs := []string{
		"--quiet",
		"--no-warnings",
		"--no-playlist",
		"--no-progress",
		"--max-filesize", maxFileSize,
		"--format", audioFormat,
		"--output", "-",
		"--", url,
	}

	var bufStdErr bytes.Buffer
	cmd := exec.CommandContext(ctx, t.ytdlpExec, cmdArgs...)
	cmd.Stdout = out
	cmd.Stderr = &bufStdErr
	err := cmd.Run()

	if errors.Is(err, exec.ErrNotFound) {
		return ErrNotInstalled
	}

	if cmd.ProcessState != nil && cmd.ProcessState.ExitCode() != 0 {
		err = errors.New(strings.TrimSpace(bufStdErr.String()))
	}

	return err
}
