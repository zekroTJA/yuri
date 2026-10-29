package main

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/alexedwards/argon2id"
	"github.com/alexflint/go-arg"
	"github.com/zekrotja/yuri/pkg/ytdlp"
)

type Args struct {
	BindAddress string `àrg:"--bind-address,env:BIND_ADDRESS" default:"0.0.0.0:8080" help:"Bind address for API server"`
	YtdlpPath   string `arg:"--ytdlp-path,env:YTDLP_PATH" help:"Path to yt-dlp executable"`
	StoragePath string `arg:"--storage-path,env:STORAGE_PATH" default:"storage.json" help:"Path to the persistent storage"`
}

type Storage struct {
	TokenHash string
}

func (t *Storage) Store(storagePath string) error {
	f, err := os.Create(storagePath)
	if err != nil {
		return err
	}
	return json.NewEncoder(f).Encode(t)
}

func main() {
	var args Args
	arg.MustParse(&args)

	fmt.Println(`
          __     ____        __
    __ __/ /____/ / /__  ___/ /
   / // / __/ _  / / _ \/ _  /
   \_, /\__/\_,_/_/ .__/\_,_/
  /___/          /_/

  yt-dlp deamon proxy
	`)

	downloader, err := ytdlp.New(args.YtdlpPath)
	if err != nil {
		slog.Error("failed initializing downloader", "err", err)
		os.Exit(1)
	}

	storage, err := loadStorage(args.StoragePath)
	if err != nil {
		slog.Error("failed opening storage file", "err", err, "path", args.StoragePath)
		os.Exit(1)
	}

	if storage.TokenHash == "" {
		var token string
		token, storage.TokenHash, err = generateToken()
		if err != nil {
			slog.Error("failed to generate secret", "err", err)
			os.Exit(1)
		}

		fmt.Println("A new token has been initialized. It is only shown on this startup and not again!")
		fmt.Println("Add the following to your Yuri config:\n")
		fmt.Println("  YURI_YTDLPD_URL: <PUBLIC_URL_OF_THIS_SERVICE>")
		fmt.Printf("  YURI_YTDLPD_TOKEN: %s\n\n", token)

		if err = storage.Store(args.StoragePath); err != nil {
			slog.Error("failed to save storage file", "err", err, "path", args.StoragePath)
			os.Exit(1)
		}
	}

	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/v1/download",
		downloadHandler(downloader, storage.TokenHash))
	mux.HandleFunc("GET /api/v1/health", healthcheckHandler())

	slog.Info("Ready to receive requests", "addr", args.BindAddress)
	if err = http.ListenAndServe(args.BindAddress, mux); err != nil {
		slog.Error("failed start server", "err", err)
		os.Exit(1)
	}
}

type downloadPayload struct {
	Url string `json:"url"`
}

func downloadHandler(downloader *ytdlp.YtDlp, tokenHash string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := strings.SplitN(r.Header.Get("Authorization"), " ", 2)
		if len(authHeader) < 2 || !strings.EqualFold(authHeader[0], "bearer") {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		match, err := checkToken(authHeader[1], tokenHash)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprintf(w, "error checking auth token: %s", err.Error())
			return
		}
		if !match {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		var payload downloadPayload
		if err = json.NewDecoder(r.Body).Decode(&payload); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			fmt.Fprintf(w, "invalid payload: %s", err.Error())
			return
		}

		if strings.TrimSpace(payload.Url) == "" {
			w.WriteHeader(http.StatusBadRequest)
			fmt.Fprint(w, "missing url")
			return
		}

		err = downloader.Download(r.Context(), payload.Url, w)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprintf(w, "error downloading url: %s", err.Error())
			return
		}
	}
}

func healthcheckHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}
}

func loadStorage(storagePath string) (*Storage, error) {
	f, err := os.Open(storagePath)
	if os.IsNotExist(err) {
		return &Storage{}, nil
	}
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var st Storage
	if err = json.NewDecoder(f).Decode(&st); err != nil {
		return nil, err
	}

	return &st, nil
}

func generateToken() (token string, hash string, err error) {
	token = randString(32)
	hash, err = argon2id.CreateHash(token, argon2id.DefaultParams)
	if err != nil {
		return "", "", err
	}
	return token, hash, nil
}

func randString(ln int) string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
	src := make([]byte, ln)
	_, _ = rand.Read(src)
	for i := range src {
		src[i] = chars[src[i]%byte(len(chars))]
	}
	return string(src)
}

func checkToken(token string, hash string) (bool, error) {
	return argon2id.ComparePasswordAndHash(token, hash)
}
