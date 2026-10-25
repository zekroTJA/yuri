FROM --platform=$BUILDPLATFORM oven/bun:1-alpine AS web
WORKDIR /build
COPY web/package.json web/bun.lock ./
RUN bun install --frozen-lockfile
COPY web/ ./
RUN bun run build

FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS backend
ARG TARGETOS
ARG TARGETARCH
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY cmd/ cmd/
COPY pkg/ pkg/
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -ldflags="-s -w" -o /yuri ./cmd/yuri

FROM alpine:3
RUN apk add --no-cache ffmpeg yt-dlp ca-certificates \
    && adduser --disabled-password --no-create-home --uid 1000 yuri \
    && mkdir --parents /data/storage \
    && chown --recursive yuri:yuri /data
COPY --from=backend /yuri /usr/local/bin/yuri
COPY --from=web /build/dist /usr/share/yuri/web
ENV YURI_API_ADDRESS=0.0.0.0:8080 \
    YURI_API_WEBAPPPATH=/usr/share/yuri/web \
    YURI_DATABASE_DSN=/data/db.sqlite3 \
    YURI_STORAGE_DIR=/data/storage
USER yuri
VOLUME /data
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/yuri"]
