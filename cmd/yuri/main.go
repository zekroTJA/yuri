package main

import (
	"log/slog"
	"os"
	"time"

	"github.com/davecgh/go-spew/spew"
	"github.com/zekrotja/yuri/pkg/api"
	"github.com/zekrotja/yuri/pkg/config"
	"github.com/zekrotja/yuri/pkg/database"
	"github.com/zekrotja/yuri/pkg/ffmpeg"
	"github.com/zekrotja/yuri/pkg/storage"
)

func main() {
	if err := run(); err != nil {
		os.Exit(1)
	}
}

func run() error {
	stared := time.Now()
	slog.Info("Starting up ...")

	slog.Info("Parsing config from env ...")
	cfg, err := config.New()
	if err != nil {
		slog.Error("Failed parsing config", "err", err)
		return err
	}
	spew.Dump(cfg)
	slog.SetLogLoggerLevel(cfg.Logging.Level)
	slog.Info("Config parsed")

	enc, err := ffmpeg.New(cfg.Ffmpeg.Path)
	if err != nil {
		slog.Error("Failed initializing encoder", "err", err)
		return err
	}

	slog.Info("Initializing database ...")
	db, err := database.New(cfg.Database.Dsn)
	if err != nil {
		slog.Error("Failed initializing database", "err", err)
		return err
	}
	slog.Info("Database initialized")

	_ = db

	slog.Info("Initialization finished", "took", time.Since(stared))

	st, err := storage.New(cfg.Storage.Dir)
	if err != nil {
		slog.Error("Failed initializing storage", "err", err)
		return err
	}

	slog.Info("Web server running and accepting requests ...", "addr", cfg.Api.Address)
	err = api.Run(cfg.Api, st, enc, db)
	if err != nil {
		slog.Error("Failed starting web server", "err", err)
		return err
	}

	return nil
}
