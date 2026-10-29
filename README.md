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
| `YURI_YTDLPD_URL`              |                       | Base URL of an external [ytdlpd](#external-download-proxy-ytdlpd) service. If set, URL imports are downloaded via this service.    |
| `YURI_YTDLPD_TOKEN`            |                       | Token used to authenticate against the ytdlpd service. Printed by ytdlpd on its first startup.                                     |

### External download proxy (ytdlpd)

Some platforms, like YouTube, block requests coming from IP ranges that belong to data centers. If Yuri is hosted on a VPS, importing sounds from URLs might therefore fail, even though yt-dlp itself works fine.

To work around this, downloads can be delegated to **ytdlpd**, a small download proxy service that runs yt-dlp on behalf of Yuri. Host it somewhere with a residential IP address — for example a homelab server or a Raspberry Pi at home — and point Yuri to it. When ytdlpd is configured, Yuri sends all URL imports to it and receives the downloaded audio back. Transcoding is still done by Yuri.

ytdlpd is published as a Docker image for `linux/amd64` and `linux/arm64`:

```
ghcr.io/zekrotja/yuri-ytdlpd:latest
```

#### Setting up ytdlpd

Start the service on the host that should perform the downloads. Its state is stored in the `/data` volume.

```bash
docker run -d \
  --name yuri-ytdlpd \
  -p 8080:8080 \
  -v yuri-ytdlpd-data:/data \
  ghcr.io/zekrotja/yuri-ytdlpd:latest
```

Or with Docker Compose:

```yaml
services:
    ytdlpd:
        image: ghcr.io/zekrotja/yuri-ytdlpd:latest
        restart: unless-stopped
        ports:
            - "8080:8080"
        volumes:
            - ytdlpd-data:/data

volumes:
    ytdlpd-data:
```

On its first startup, ytdlpd generates an access token and prints it to the log. Look it up with:

```bash
docker logs yuri-ytdlpd
# or: docker compose logs ytdlpd
```

The output looks like this:

```
A new token has been initialized. It is only shown on this startup and not again!
Add the following to your Yuri config:

  YURI_YTDLPD_URL: <PUBLIC_URL_OF_THIS_SERVICE>
  YURI_YTDLPD_TOKEN: <token>
```

> [!IMPORTANT]
> The token is shown **only once**. Only a hash of it is persisted in `/data/storage.json`, so it cannot be recovered later. If you lose it, stop the container, delete `storage.json` from the data volume (or recreate the volume) and start it again to generate a new token.

#### Configuring Yuri

Set the following environment variables on your Yuri instance and restart it:

```yaml
services:
    yuri:
        image: ghcr.io/zekrotja/yuri:latest
        environment:
            # ...
            YURI_YTDLPD_URL: "https://ytdlpd.example.com"
            YURI_YTDLPD_TOKEN: "<token>"
```

`YURI_YTDLPD_URL` is the base URL under which Yuri can reach ytdlpd — without the `/api/v1/...` path. As long as it is set, the local yt-dlp installation of Yuri is not used.

> [!WARNING]
> ytdlpd itself serves plain HTTP. Because the token is sent with every request, do not expose it to the internet without TLS. Put it behind a reverse proxy with HTTPS, or connect Yuri and ytdlpd through a VPN like WireGuard or Tailscale.

ytdlpd provides an unauthenticated health check endpoint at `GET /api/v1/health`, which is also used by the Docker health check of the image. The yt-dlp version shipped with the image is pinned at build time. Pull the image regularly to keep yt-dlp up to date, since sites like YouTube frequently change in ways that break older versions.

### Management CLI

The image ships with `mgmt`, a command line tool that manages data directly in the database. This is useful, for example, to create users when registration is disabled via `YURI_API_DISABLEREGISTRATION`.

Run it inside the running container with `docker exec`. The database location is read from `YURI_DATABASE_DSN`, which is already set in the image, so no further configuration is needed.

```bash
docker exec -it yuri mgmt --help
```

When using Docker Compose, use `docker compose exec yuri mgmt …` instead.

#### Users

```bash
# List all users
docker exec yuri mgmt users list

# Create a user with a randomly generated password, which is printed once
docker exec yuri mgmt users create alice

# Create a user and enter the password interactively
docker exec -it yuri mgmt users create alice --read-password

# Delete a user (asks for confirmation; pass --yes to skip it)
docker exec -it yuri mgmt users delete alice
```

User handles are stored in lowercase, the same as when registering via the web app. You can also pass the password with `--password <password>`, but keep in mind that it may end up in your shell history.

Deleting a user also deletes their API keys, their channel memberships and all channels they created. Sounds uploaded by the user are kept.

To operate on a different database file, pass `-d`/`--database <path>`.

## License

The source code of this project is licensed under the [MIT License](LICENSE).

The project logo and other branding assets (`.github/media/banner.webp` and all image files in `web/public/`) are **not** covered
by the MIT License. They are © 2026 Ringo Hoffmann, all rights reserved, and may not be used for other purposes, copied or modified without prior written permission.
