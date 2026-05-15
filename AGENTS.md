# Response Style

- Do NOT summarize changes after completing a task
- No bullet-point lists of what was modified
- No "Here's what I did" wrap-ups
- Be terse — confirm completion with one line max, or nothing at all
- Only explain something if explicitly asked
- Do not provide a summary of what was added except it is explicitly asked for
- Don't run any build or test commands

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

`cmd/yuri/main.go` is the entrypoint. It wires the three packages together: config → database → api.

## `pkg/config`

Reads configuration from environment variables using `kelseyhightower/envconfig` with the `YURI_` prefix. Nested structs map to `YURI_<STRUCT>_<FIELD>` (e.g. `YURI_API_ADDRESS`, `YURI_DATABASE_DSN`, `YURI_LOGGING_LEVEL`).

## `pkg/database`

Wraps `gorm.DB` backed by a pure-Go SQLite driver (`glebarez/sqlite`). `database.New(dsn)` opens the connection and runs `AutoMigrate` on all models listed in `models.go`. Add new models to the `models` slice in `models.go` so they are auto-migrated.

Current models: `User`, `Sound`, `Channel` — all embed `gorm.Model` for ID/timestamps/soft-delete.

## `pkg/api`

Sets up a Gin router in release mode. All handlers are methods on the unexported `api` struct, which holds a `*database.Database`. Routes are registered under the `/api/v1` group. Add new route files in `pkg/api/` and register routes in `api.go`'s `Run` function.
