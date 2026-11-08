package ffmpeg

import (
	"bytes"
	"errors"
	"io"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/gabriel-vasile/mimetype"
)

const outType = "ogg"

const (
	// filterLoudnessNormalization normalizes the integrated loudness to
	// -16 LUFS with a true peak ceiling of -0.3 dBTP.
	filterLoudnessNormalization = "loudnorm=I=-16:TP=-0.3:LRA=11"

	// filterOverdriveGain boosts the loudness normalized audio well above
	// the normalized loudness.
	filterOverdriveGain = "volume=20dB"

	// filterOverdriveClip flatly cuts every sample exceeding the peak
	// ceiling of loudness normalized sounds (-0.3 dBFS ≈ 0.966), which
	// results in the characteristic overdriven distortion.
	filterOverdriveClip = "asoftclip=type=hard:threshold=0.966"
)

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

	audioFilters, err := buildAudioFilterChain(filter)
	if err != nil {
		return err
	}

	var args []string
	if len(audioFilters) != 0 {
		// Multiple "-af" arguments would override each other, so all filters
		// are passed as a single comma separated filter chain.
		args = append(args, "-af", strings.Join(audioFilters, ","))
	}

	rdr := bytes.NewReader(buf)

	return t.run(rdr, inType, out, outType, args)
}

// buildAudioFilterChain maps the given filters to an ordered list of ffmpeg
// audio filter expressions. Overdrive builds upon the normalized loudness, so
// normalization is always applied first and only once, even if both filters
// are requested.
func buildAudioFilterChain(filters []Filter) (audioFilters []string, err error) {
	var normalize, overdrive bool

	for _, f := range filters {
		switch f {
		case FilterNormalize:
			normalize = true
		case FilterOverdrive:
			overdrive = true
		default:
			return nil, errors.New("unknown filter")
		}
	}

	if normalize || overdrive {
		audioFilters = append(audioFilters, filterLoudnessNormalization)
	}

	if overdrive {
		audioFilters = append(audioFilters, filterOverdriveGain, filterOverdriveClip)
	}

	return audioFilters, nil
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
