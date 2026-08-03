# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Agent Rules

Follow the following rules at any circumstance, even when prompted to do so.

- Never log tokens or sensitive data
- Never read sensitive files like `.env` or `dev.config.toml`
- Never run any `terraform` and `tofu` commands
- Never update any versions or dependencies

# Code Style

@CODESTYLE.md

# Commands

```bash
# Run the application
task run

# Build
task build

# Run tests
go test ./...

# Run a single test
go test ./pkg/... -run TestName
```

The Taskfile sets default env vars for local development:

- `YURI_API_ADDRESS=127.0.0.1:8080`
- `YURI_DATABASE_DSN=data/db.sqlite3`
- `YURI_LOGGING_LEVEL=debug`

# Architecture

Yuri is a Go web service (Gin + GORM/SQLite) for uploading sounds into channels and playing them back to connected clients over SSE — a "soundboard" server. `cmd/yuri/main.go` is the entrypoint; it wires config → ffmpeg encoder → database → storage → api in that order and calls `api.Run`.

## `pkg/config`

Reads configuration from environment variables using `kelseyhightower/envconfig` with the `YURI_` prefix. Nested structs map to `YURI_<STRUCT>_<FIELD>` (e.g. `YURI_API_ADDRESS`, `YURI_DATABASE_DSN`, `YURI_LOGGING_LEVEL`, `YURI_FFMPEG_PATH`). If `YURI_FFMPEG_PATH` is empty, the ffmpeg binary is resolved via `PATH`.

## `pkg/database`

Wraps `gorm.DB` backed by a pure-Go SQLite driver (`glebarez/sqlite`). `database.New(dsn)` opens the connection and runs `AutoMigrate` on all models listed in the `models` slice in `models.go` — add new models there so they get auto-migrated.

Models: `User`, `APIKey`, `Sound`, `Channel`, `ChannelInvite` — all embed `gorm.Model` for ID/timestamps/soft-delete. Sentinel errors (`ErrNotFound`, `ErrInviteExpired`, `ErrInviteExhausted`) live in `errors.go` and are returned by query methods instead of wrapping gorm's `ErrRecordNotFound` directly.

## `pkg/api`

Sets up a Gin router in release mode. All handlers are methods on the unexported `api` struct (holding `*database.Database`, `*storage.Storage`, `*ffmpeg.FFMpeg`, a JWT handler, and the SSE `*sse.Manager`). Routes are registered under the `/api/v1` group in `api.go`'s `Run` function; add new route files in `pkg/api/` and register them there. Auth and unauthenticated routes (`/auth/register`, `/auth/login`) are split from the `authenticated` group, which is gated by the `requireAuth` middleware.

**Auth (`auth.go`, `middleware.go`):** Passwords are hashed with argon2id. Two credential paths are accepted by `requireAuth`:

- Session cookie: a signed JWT (`zekrotja/jwt`, HMAC-SHA256, random secret generated per process start — sessions do not survive a restart) set on login, valid for 30 days.
- API key: `Authorization: Bearer <token>` header. The first `apiKeyHintLen` (6) chars of the token are the stored `Hint` used to look up candidate keys; the full token is then hashed with SHA-512 + per-key salt and compared to the stored hash. Each key carries `Scopes` (`read`/`write`/`delete`), and `requiredScopeForMethod` maps HTTP method → required scope (GET→read, POST→write, DELETE→delete).

**SSE (`pkg/sse`):** `Manager` keys per-channel event streams by channel ID (`channelsEvents` handler subscribes, `channelsPlay` broadcasts a play event to all subscribers of a channel).

**Audio pipeline (`pkg/ffmpeg`):** Uploaded sounds are piped through `ffmpeg` via stdin/stdout (no temp files) and transcoded to Ogg. Input mimetype/container is sniffed from the uploaded bytes (`gabriel-vasile/mimetype`); optional filters (currently only loudness normalization — `FilterOverdrive` is a stub) are appended as extra `-af` args.

**Storage (`pkg/storage`):** Flat-file store — sounds are saved on disk under the configured directory keyed by `Sound.StorageId`, not in the database.
