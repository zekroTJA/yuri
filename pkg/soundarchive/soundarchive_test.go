package soundarchive

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"io"
	"slices"
	"testing"
	"time"
)

func TestRoundTrip(t *testing.T) {
	var buf bytes.Buffer

	archive, err := NewWriter(&buf)
	if err != nil {
		t.Fatalf("creating writer: %v", err)
	}
	sounds := map[string][]byte{
		"bingbong": []byte("OggS bingbong"),
		"airhorn":  []byte("OggS airhorn"),
	}
	for name, content := range sounds {
		if err = archive.WriteSound(name, content); err != nil {
			t.Fatalf("writing sound: %v", err)
		}
	}
	metas := []Meta{
		{Name: "bingbong", Tags: []string{"bell"}, Creator: "alice", CreatedAt: time.Unix(100, 0).UTC()},
		{Name: "airhorn", CreatedAt: time.Unix(200, 0).UTC()},
	}
	if err = archive.WriteMeta(metas); err != nil {
		t.Fatalf("writing meta: %v", err)
	}
	if err = archive.Close(); err != nil {
		t.Fatalf("closing writer: %v", err)
	}

	readMetas, err := ReadMeta(bytes.NewReader(buf.Bytes()))
	if err != nil {
		t.Fatalf("reading meta: %v", err)
	}
	if len(readMetas) != len(metas) {
		t.Fatalf("expected %d metas, got %d", len(metas), len(readMetas))
	}
	for i, meta := range metas {
		got := readMetas[i]
		if got.Name != meta.Name || got.Creator != meta.Creator ||
			!got.CreatedAt.Equal(meta.CreatedAt) || !slices.Equal(got.Tags, meta.Tags) {
			t.Errorf("meta %d: expected %+v, got %+v", i, meta, got)
		}
	}

	readSounds := map[string][]byte{}
	err = ReadSounds(bytes.NewReader(buf.Bytes()), func(name string, content io.Reader) error {
		data, err := io.ReadAll(content)
		readSounds[name] = data
		return err
	})
	if err != nil {
		t.Fatalf("reading sounds: %v", err)
	}
	if len(readSounds) != len(sounds) {
		t.Fatalf("expected %d sounds, got %d", len(sounds), len(readSounds))
	}
	for name, content := range sounds {
		if !bytes.Equal(readSounds[name], content) {
			t.Errorf("sound %q: expected %q, got %q", name, content, readSounds[name])
		}
	}
}

func TestReadSoundsIgnoresForeignEntries(t *testing.T) {
	archive := buildArchive(t, map[string]string{
		"sounds/ok.oga":         "OggS",
		"./sounds/dotted.oga":   "OggS",
		"sounds/nested/x.oga":   "OggS",
		"sounds/../escape.oga":  "OggS",
		"../sounds/outside.oga": "OggS",
		"sounds/readme.txt":     "text",
		"other/sound.oga":       "OggS",
	})

	var names []string
	err := ReadSounds(bytes.NewReader(archive), func(name string, content io.Reader) error {
		names = append(names, name)
		return nil
	})
	if err != nil {
		t.Fatalf("reading sounds: %v", err)
	}

	slices.Sort(names)
	expected := []string{"dotted", "ok", "outside"}
	if !slices.Equal(names, expected) {
		t.Errorf("expected %v, got %v", expected, names)
	}
}

func TestReadMetaMissing(t *testing.T) {
	archive := buildArchive(t, map[string]string{"sounds/ok.oga": "OggS"})
	if _, err := ReadMeta(bytes.NewReader(archive)); err != ErrMetaNotFound {
		t.Errorf("expected ErrMetaNotFound, got %v", err)
	}
}

func TestReadMetaInvalidArchive(t *testing.T) {
	if _, err := ReadMeta(bytes.NewReader([]byte("not an archive"))); err == nil {
		t.Error("expected error for invalid archive")
	}
}

func buildArchive(t *testing.T, files map[string]string) []byte {
	t.Helper()

	var buf bytes.Buffer
	gzipWriter := gzip.NewWriter(&buf)
	tarWriter := tar.NewWriter(gzipWriter)
	for name, content := range files {
		err := tarWriter.WriteHeader(&tar.Header{
			Typeflag: tar.TypeReg,
			Name:     name,
			Size:     int64(len(content)),
			Mode:     fileMode,
		})
		if err != nil {
			t.Fatalf("writing header: %v", err)
		}
		if _, err = tarWriter.Write([]byte(content)); err != nil {
			t.Fatalf("writing content: %v", err)
		}
	}
	if err := tarWriter.Close(); err != nil {
		t.Fatalf("closing tar writer: %v", err)
	}
	if err := gzipWriter.Close(); err != nil {
		t.Fatalf("closing gzip writer: %v", err)
	}
	return buf.Bytes()
}
