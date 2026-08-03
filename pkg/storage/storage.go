package storage

import (
	"io"
	"os"
	"path/filepath"
)

type Storage struct {
	dir string
}

func New(dir string) (*Storage, error) {
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}
	return &Storage{dir: dir}, nil
}

func (t *Storage) Store(name string, r io.Reader) error {
	f, err := os.Create(filepath.Join(t.dir, name))
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, r)
	return err
}

func (t *Storage) Load(name string) (io.ReadCloser, error) {
	return os.Open(filepath.Join(t.dir, name))
}

func (t *Storage) Delete(name string) error {
	return os.Remove(filepath.Join(t.dir, name))
}
