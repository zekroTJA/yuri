package ffmpeg

import (
	"bytes"
	"errors"
	"io"
	"os/exec"
	"strconv"
	"time"

	"github.com/gabriel-vasile/mimetype"
)

const outType = "ogg"

type Filter int

const (
	FilterNormalize Filter = iota + 1
	FilterOverdrive
)

type FFMpeg struct {
	ffmpegExec string
}

func New(ffmpegExec string) (*FFMpeg, error) {
	ffmpegExec, err := getFfmpegPath(ffmpegExec)
	if err != nil {
		return nil, err
	}

	return &FFMpeg{ffmpegExec: ffmpegExec}, nil
}

func (t *FFMpeg) Format(in io.Reader, out io.Writer, filter ...Filter) error {
	buf, inType, err := readAndDetectType(in)
	if err != nil {
		return err
	}

	var args []string

	for _, f := range filter {
		switch f {
		case FilterNormalize:
			args = append(args, "-af", "loudnorm=I=-16:TP=-0.3:LRA=11")
		case FilterOverdrive:
			return errors.New("not implemented yet")
		default:
			return errors.New("unknown filter")
		}
	}

	rdr := bytes.NewReader(buf)

	return t.run(rdr, inType, out, outType, args)
}

// Trim cuts the audio read from in to the range between start and end and
// writes the result encoded as Ogg to out.
func (t *FFMpeg) Trim(in io.Reader, out io.Writer, start time.Duration, end time.Duration) error {
	if start < 0 || end <= start {
		return errors.New("invalid trim range")
	}

	buf, inType, err := readAndDetectType(in)
	if err != nil {
		return err
	}

	// Passed after the input so that they are applied as output options,
	// which results in sample accurate cuts instead of seeking to the
	// nearest keyframe.
	args := []string{
		"-ss", formatSeconds(start),
		"-to", formatSeconds(end),
	}

	return t.run(bytes.NewReader(buf), inType, out, outType, args)
}

func (t *FFMpeg) run(
	in io.Reader,
	inTyp string,
	out io.Writer,
	outTyp string,
	args []string,
) error {
	var cmdArgs []string
	cmdArgs = append(cmdArgs, "-f", mapType(inTyp), "-i", "pipe:", "-map", "0:a:0")
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

func readAndDetectType(in io.Reader) (buf []byte, inType string, err error) {
	buf, err = io.ReadAll(in)
	if err != nil {
		return nil, "", err
	}

	mimeType := mimetype.Detect(buf)
	if mimeType == nil {
		return nil, "", errors.New("could not detect mimetype")
	}

	inExt := mimeType.Extension()
	if inExt == "" {
		return nil, "", errors.New("could not detect file extension")
	}

	// TODO: Check against allowed in mimetypes
	return buf, inExt[1:], nil
}

func formatSeconds(d time.Duration) string {
	return strconv.FormatFloat(d.Seconds(), 'f', 3, 64)
}

func getFfmpegPath(path string) (string, error) {
	if path != "" {
		return path, nil
	}

	ffmpegExec, err := exec.LookPath("ffmpeg")
	if errors.Is(err, exec.ErrNotFound) {
		return "", errors.New("ffmpeg executable was not found")
	}
	if err != nil {
		return "", err
	}

	return ffmpegExec, nil
}

func mapType(ext string) string {
	switch ext {
	case "oga", "ogv", "ogx":
		return "ogg"
	default:
		return ext
	}
}
