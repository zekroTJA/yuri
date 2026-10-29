package config

import (
	"log/slog"

	"github.com/kelseyhightower/envconfig"
)

type Config struct {
	Api      *Api
	Database *Database
	Logging  *Logging
	Storage  *Storage
	Ffmpeg   *Ffmpeg
	Ytdlp    *Ytdlp
	Ytdlpd   *Ytdlpd
}

type Logging struct {
	Level slog.Level `default:"info"`
}

type Api struct {
	Address             string `default:"0.0.0.0:8080"`
	WebAppPath          string `default:""`
	CORSOrigin          string `default:""`
	SigningSecret       string `default:""`
	DisableRegistration bool   `default:"false"`
}

type Database struct {
	Dsn string `default:"database.sqlite3"`
}

type Storage struct {
	Dir string `default:"data/storage"`
}

type Ffmpeg struct {
	Path string `default:""`
}

type Ytdlp struct {
	Path string `default:""`
}

type Ytdlpd struct {
	Url   string `default:""`
	Token string `default:""`
}

func New() (*Config, error) {
	var cfg Config
	err := envconfig.Process("yuri", &cfg)
	if err != nil {
		return nil, err
	}
	return &cfg, nil
}
