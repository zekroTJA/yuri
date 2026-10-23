// Package soundarchive implements reading and writing of sound archives.
//
// A sound archive is a gzip compressed tar file with the following layout:
//
//	meta.json        - JSON list of Meta entries, one per sound
//	sounds/<name>.oga - Ogg encoded sound file per sound
package soundarchive

import (
	"archive/tar"
	"compress/gzip"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"path"
	"strings"
	"time"
)

const (
	MetaFileName  = "meta.json"
	SoundsDir     = "sounds"
	SoundFileExt  = ".oga"
	maxMetaSize   = 10 << 20
	fileMode      = 0644
	directoryMode = 0755
)

var (
	ErrMetaNotFound = errors.New("archive does not contain a meta.json")
	ErrMetaTooLarge = errors.New("meta.json exceeds the maximum size")
)

type Meta struct {
	Name      string    `json:"name"`
	Tags      []string  `json:"tags"`
	Creator   string    `json:"creator,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// SoundCallback is called for each sound file in an archive with the sound
// name (file name without directory and extension) and the file content.
type SoundCallback func(name string, content io.Reader) error

// SoundFilePath returns the path of the sound file with the given name
// within an archive.
func SoundFilePath(name string) string {
	return path.Join(SoundsDir, name+SoundFileExt)
}

type Writer struct {
	gzipWriter *gzip.Writer
	tarWriter  *tar.Writer
	modTime    time.Time
}

// NewWriter creates a new archive Writer writing to w. Close must be called
// after all entries have been written to flush the archive.
func NewWriter(w io.Writer) (*Writer, error) {
	gzipWriter := gzip.NewWriter(w)
	tarWriter := tar.NewWriter(gzipWriter)

	t := &Writer{
		gzipWriter: gzipWriter,
		tarWriter:  tarWriter,
		modTime:    time.Now().Truncate(time.Second),
	}

	err := tarWriter.WriteHeader(&tar.Header{
		Typeflag: tar.TypeDir,
		Name:     SoundsDir + "/",
		Mode:     directoryMode,
		ModTime:  t.modTime,
	})
	if err != nil {
		return nil, err
	}

	return t, nil
}

func (t *Writer) WriteMeta(metas []Meta) error {
	data, err := json.MarshalIndent(metas, "", "  ")
	if err != nil {
		return err
	}
	return t.writeFile(MetaFileName, data)
}

func (t *Writer) WriteSound(name string, content []byte) error {
	return t.writeFile(SoundFilePath(name), content)
}

func (t *Writer) Close() error {
	if err := t.tarWriter.Close(); err != nil {
		return err
	}
	return t.gzipWriter.Close()
}

func (t *Writer) writeFile(name string, content []byte) error {
	err := t.tarWriter.WriteHeader(&tar.Header{
		Typeflag: tar.TypeReg,
		Name:     name,
		Size:     int64(len(content)),
		Mode:     fileMode,
		ModTime:  t.modTime,
	})
	if err != nil {
		return err
	}
	_, err = t.tarWriter.Write(content)
	return err
}

// ReadMeta reads the archive from r and returns the decoded contents of the
// meta.json file.
func ReadMeta(r io.Reader) ([]Meta, error) {
	var metas []Meta
	found := false

	err := walk(r, func(name string, content io.Reader) error {
		if name != MetaFileName {
			return nil
		}
		data, err := io.ReadAll(io.LimitReader(content, maxMetaSize+1))
		if err != nil {
			return err
		}
		if len(data) > maxMetaSize {
			return ErrMetaTooLarge
		}
		if err = json.Unmarshal(data, &metas); err != nil {
			return fmt.Errorf("invalid meta.json: %w", err)
		}
		found = true
		return errStopWalk
	})
	if err != nil {
		return nil, err
	}

	if !found {
		return nil, ErrMetaNotFound
	}

	return metas, nil
}

// ReadSounds reads the archive from r and calls onSound for each sound file
// contained in it. Entries outside of the sounds directory, nested entries
// and files without the sound file extension are ignored.
func ReadSounds(r io.Reader, onSound SoundCallback) error {
	return walk(r, func(name string, content io.Reader) error {
		dir, fileName := path.Split(name)
		if dir != SoundsDir+"/" || !strings.HasSuffix(fileName, SoundFileExt) {
			return nil
		}
		soundName := strings.TrimSuffix(fileName, SoundFileExt)
		if soundName == "" {
			return nil
		}
		return onSound(soundName, content)
	})
}

var errStopWalk = errors.New("stop walk")

type fileCallback func(name string, content io.Reader) error

// walk calls onFile for each regular file in the archive read from r with
// its cleaned path. Returning errStopWalk from onFile stops the walk without
// an error.
func walk(r io.Reader, onFile fileCallback) error {
	gzipReader, err := gzip.NewReader(r)
	if err != nil {
		return fmt.Errorf("invalid gzip stream: %w", err)
	}
	defer gzipReader.Close()

	tarReader := tar.NewReader(gzipReader)
	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return fmt.Errorf("invalid tar archive: %w", err)
		}

		if header.Typeflag != tar.TypeReg {
			continue
		}

		name := strings.TrimPrefix(path.Clean("/"+header.Name), "/")
		err = onFile(name, tarReader)
		if err == errStopWalk {
			return nil
		}
		if err != nil {
			return err
		}
	}
}
