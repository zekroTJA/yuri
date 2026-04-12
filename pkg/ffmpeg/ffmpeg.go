package ffmpeg

import (
	"bytes"
	"errors"
	"io"
	"os/exec"
)

type FFMpeg struct {
	ffmpegExec string
}

func New(ffmpegExec string) (*FFMpeg, error) {
	ffmpegExec, err := exec.LookPath("ffmpeg")
	if errors.Is(err, exec.ErrNotFound) {
		return nil, errors.New("ffmpeg executable was not found")
	}

	return &FFMpeg{ffmpegExec: ffmpegExec}, nil
}

func (t *FFMpeg) ffmpeg(
	in io.Reader,
	inTyp string,
	out io.Writer,
	outTyp string,
	args ...string,
) error {
	var cmdArgs []string
	cmdArgs = append(cmdArgs, "-f", inTyp, "-i", "pipe:", "-map", "0:a:0")
	cmdArgs = append(cmdArgs, args...)
	cmdArgs = append(cmdArgs, "-f", outTyp, "pipe:")

	var bufStdErr bytes.Buffer
	cmd := exec.Command(t.ffmpegExec, cmdArgs...)
	cmd.Stdin = in
	cmd.Stdout = out
	cmd.Stderr = &bufStdErr
	err := cmd.Run()

	if cmd.ProcessState != nil && cmd.ProcessState.ExitCode() != 0 {
		err = errors.New(bufStdErr.String())
	}

	return err
}
