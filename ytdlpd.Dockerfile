FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS backend
ARG TARGETOS
ARG TARGETARCH
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY cmd/ cmd/
COPY pkg/ pkg/
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -ldflags="-s -w" -o /ytdlpd ./cmd/ytdlpd

FROM alpine:3
RUN apk add --no-cache ffmpeg yt-dlp ca-certificates \
    && adduser --disabled-password --no-create-home --uid 1000 ytdlpd \
    && mkdir --parents /data \
    && chown --recursive ytdlpd:ytdlpd /data
COPY --from=backend /ytdlpd /usr/local/bin/ytdlpd
ENV BIND_ADDRESS=0.0.0.0:8080 \
    STORAGE_PATH=/data/storage.json
USER ytdlpd
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --output-document=/dev/null "http://127.0.0.1:${BIND_ADDRESS##*:}/api/v1/health" || exit 1
ENTRYPOINT ["/usr/local/bin/ytdlpd"]
