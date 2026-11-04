package main

import (
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/zekrotja/yuri/pkg/api"
	"github.com/zekrotja/yuri/pkg/config"
	"github.com/zekrotja/yuri/pkg/database"
	"github.com/zekrotja/yuri/pkg/ffmpeg"
	"github.com/zekrotja/yuri/pkg/static"
	"github.com/zekrotja/yuri/pkg/storage"
	"github.com/zekrotja/yuri/pkg/ytdlp"
	"github.com/zekrotja/yuri/pkg/ytdlpd"
)

func main() {
	if err := run(); err != nil {
		os.Exit(1)
	}
}

func run() error {
	stared := time.Now()

	fmt.Printf(`

  __  ____  ______  ____
  \ \/ / / / / __ \/  _/
   \  / / / / /_/ // /
   / / /_/ / _, _// /
  /_/\____/_/ |_/___/

  version:     %s
  build date:  %s

`, static.Version(), static.BuildDate())

	slog.Info("Starting up ...")

	slog.Info("Parsing config from env ...")
	cfg, err := config.New()
	if err != nil {
		slog.Error("Failed parsing config", "err", err)
		return err
	}

	slog.SetLogLoggerLevel(cfg.Logging.Level)
	slog.Info("Config parsed")

	enc, err := ffmpeg.New(cfg.Ffmpeg.Path)
	if err != nil {
		slog.Error("Failed initializing encoder", "err", err)
		return err
	}

	var downloader api.Downlaoder
	if cfg.Ytdlp != nil && cfg.Ytdlpd.Url != "" {
		downloader = ytdlpd.New(cfg.Ytdlpd.Url, cfg.Ytdlpd.Token)
	} else {
		downloader, err = ytdlp.New(cfg.Ytdlp.Path)
		if err != nil {
			slog.Error("Failed initializing downloader", "err", err)
			return err
		}
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
	err = api.Run(cfg.Api, st, enc, downloader, db)
	if err != nil {
		slog.Error("Failed starting web server", "err", err)
		return err
	}

	return nil
}
