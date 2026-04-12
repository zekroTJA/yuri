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

func (s *Storage) Store(name string, r io.Reader) error {
	f, err := os.Create(filepath.Join(s.dir, name))
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, r)
	return err
}

func (s *Storage) Load(name string) (io.ReadCloser, error) {
	return os.Open(filepath.Join(s.dir, name))
}

func (s *Storage) Delete(name string) error {
	return os.Remove(filepath.Join(s.dir, name))
}
