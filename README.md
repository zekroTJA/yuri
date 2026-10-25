![](.github/media/banner.webp)

Yuri is a self-hostable soundboard server. Upload your sounds, join a channel together with your friends and play sounds back to everyone connected to that channel in real time.

## Features

- **Sound library** — Upload audio files of (almost) any format or import sounds directly from a media URL via [yt-dlp](https://github.com/yt-dlp/yt-dlp). Everything is transcoded to Ogg using ffmpeg.
- **Audio filters** — Optionally normalize the loudness of sounds on upload.
- **Sound editing** — Organize sounds with handles and tags, trim them and save edits either in place or as a new sound.
- **Channels** — Create channels, invite others via invite codes (with optional expiration and activation limits) and play sounds to all connected members in real time via Server-Sent Events.
- **Import & export** — Back up your whole sound library as a `.tar.gz` archive and import it again on another instance.
- **API keys** — Create scoped API keys (`read`, `write`, `delete`) to integrate Yuri into your own tools, bots or stream decks.
- **Web app** — A bundled web interface for managing and playing your sounds.
- **API documentation** — An OpenAPI (Swagger) specification is served at `/api/v1/docs/swagger.json` and rendered in the web app.
- **Lightweight** — A single Go binary backed by SQLite and a flat-file sound storage. No external database required.

## Self-hosting

Yuri is published as a Docker image for `linux/amd64` and `linux/arm64` on the GitHub Container Registry:

```
ghcr.io/zekrotja/yuri:latest
```

The `latest` tag follows the `main` branch. Every release is additionally tagged with its version.

The image already ships with ffmpeg and yt-dlp and serves the web app as well as the API on port `8080`. The database and all sound files are stored in the `/data` volume.

### Docker

```bash
docker run -d \
  --name yuri \
  -p 8080:8080 \
  -v yuri-data:/data \
  -e YURI_API_SIGNINGSECRET="<some-long-random-string>" \
  ghcr.io/zekrotja/yuri:latest
```

### Docker Compose

```yaml
services:
    yuri:
        image: ghcr.io/zekrotja/yuri:latest
        restart: unless-stopped
        ports:
            - "8080:8080"
        environment:
            YURI_API_SIGNINGSECRET: "<some-long-random-string>"
        volumes:
            - yuri-data:/data

volumes:
    yuri-data:
```

After starting the container, open `http://localhost:8080` in your browser and register an account.

> [!NOTE]
> The container runs as user `yuri` with UID `1000`. When you bind-mount a host directory to `/data` instead of using a named volume, make sure it is writable by this user (e.g. `chown -R 1000:1000 ./data`).

> [!IMPORTANT]
> By default, registration is open to everyone who can reach the instance. If you expose Yuri to the internet, consider disabling registration via `YURI_API_DISABLEREGISTRATION` once all users have signed up, or putting it behind a reverse proxy with TLS and access restrictions.

### Configuration

Yuri is configured via environment variables.

| Variable                       | Default (in image)    | Description                                                                                                                        |
| ------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `YURI_API_ADDRESS`             | `0.0.0.0:8080`        | Address the web server binds to.                                                                                                   |
| `YURI_API_SIGNINGSECRET`       |                       | Secret used to sign session tokens. If not set, a random secret is generated on every start, which invalidates all login sessions. |
| `YURI_API_CORSORIGIN`          |                       | Allowed CORS origin. Only required if the web app is served from a different origin than the API.                                  |
| `YURI_API_DISABLEREGISTRATION` | `false`               | Disables the registration of new users. Existing users can still log in.                                                           |
| `YURI_API_WEBAPPPATH`          | `/usr/share/yuri/web` | Directory of the bundled web app files.                                                                                            |
| `YURI_DATABASE_DSN`            | `/data/db.sqlite3`    | Path to the SQLite database file.                                                                                                  |
| `YURI_STORAGE_DIR`             | `/data/storage`       | Directory where sound files are stored.                                                                                            |
| `YURI_LOGGING_LEVEL`           | `info`                | Log level (`debug`, `info`, `warn`, `error`).                                                                                      |
| `YURI_FFMPEG_PATH`             |                       | Path to the ffmpeg executable. Resolved via `PATH` if empty.                                                                       |
| `YURI_YTDLP_PATH`              |                       | Path to the yt-dlp executable. Resolved via `PATH` if empty. Importing from URLs is disabled if yt-dlp is not available.           |

## License

The source code of this project is licensed under the [MIT License](LICENSE).

The project logo and other branding assets (`.github/media/banner.webp`, `web/public/favicon.ico` and `web/src/assets/yuri-icon.webp`) are **not** covered
by the MIT License. They are © 2026 Ringo Hoffmann, all rights reserved, and may not be used for other purposes, copied or modified without prior written permission.
