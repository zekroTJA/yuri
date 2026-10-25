package api

import (
	"crypto/rand"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zekrotja/jwt"
	"github.com/zekrotja/yuri/pkg/api/sse"
	"github.com/zekrotja/yuri/pkg/config"
	"github.com/zekrotja/yuri/pkg/database"
	"github.com/zekrotja/yuri/pkg/ffmpeg"
	"github.com/zekrotja/yuri/pkg/storage"
	"github.com/zekrotja/yuri/pkg/util"
	"github.com/zekrotja/yuri/pkg/ytdlp"
)

const (
	sessionMaxAge      = 30 * 24 * time.Hour
	sessionCookieName  = "session"
	userKey            = "user"
	apiKeyHintLen      = 6
	apiKeyCharacterLen = 64
	randomSoundHandle  = ":random"
)

type sessionClaims struct {
	jwt.PublicClaims
	UserID uint `json:"user_id"`
}

type api struct {
	db         *database.Database
	storage    *storage.Storage
	encoder    *ffmpeg.FFMpeg
	downloader *ytdlp.YtDlp
	jwtHandler jwt.Handler[sessionClaims]
	sseManager *sse.Manager

	connectionsMtx sync.RWMutex
	connections    map[uint]util.Set[uint]

	corsOrigin string
}

//	@title			Yuri API
//	@version		1.0
//	@description	Soundboard server for uploading sounds into channels and playing them back to connected clients.
//	@BasePath		/api/v1

//	@securityDefinitions.apikey	ApiKeyAuth
//	@in							header
//	@name						Authorization
//	@description				API key passed as "Bearer <token>". Alternatively, the "session" cookie set by /auth/login can be used. API keys must have the scope matching the request method: GET requires "read", POST requires "write" and DELETE requires "delete". Session cookies are not restricted by scopes.

func Run(
	cfg *config.Api,
	storage *storage.Storage,
	encoder *ffmpeg.FFMpeg,
	downloader *ytdlp.YtDlp,
	db *database.Database,
) error {
	gin.SetMode(gin.ReleaseMode)

	var secret []byte
	if cfg.SigningSecret != "" {
		secret = []byte(cfg.SigningSecret)
	} else {
		secret = make([]byte, 32)
		if _, err := rand.Read(secret); err != nil {
			return err
		}
	}

	t := &api{
		db:          db,
		storage:     storage,
		encoder:     encoder,
		downloader:  downloader,
		jwtHandler:  jwt.NewHandler[sessionClaims](jwt.NewHmacSha256(secret)),
		sseManager:  sse.NewManager(),
		connections: make(map[uint]util.Set[uint]),
		corsOrigin:  cfg.CORSOrigin,
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(t.accessLogger)

	if cfg.CORSOrigin != "" {
		router.Use(t.corsMiddleware)
		router.OPTIONS("/*any", func(ctx *gin.Context) {})
	}

	apiGroup := router.Group("/api/v1")
	apiGroup.POST("/auth/register", t.authRegister)
	apiGroup.POST("/auth/login", t.authLogin)
	apiGroup.GET("/docs/swagger.json", t.docsSwagger)

	authenticated := apiGroup.Group("/", t.requireAuth)

	authenticated.POST("/auth/password", t.authChangePassword)

	authenticated.GET("/apikeys", t.apiKeysList)
	authenticated.POST("/apikeys", t.apiKeysCreate)
	authenticated.POST("/apikeys/:id", t.apiKeysUpdate)
	authenticated.DELETE("/apikeys/:id", t.apiKeysDelete)

	authenticated.GET("/sounds", t.soundsList)
	authenticated.POST("/sounds", t.soundsUpload)
	authenticated.GET("/sounds/export", t.soundsExport)
	authenticated.POST("/sounds/import", t.soundsImport)
	authenticated.GET("/sounds/:id", t.soundsGet)
	authenticated.POST("/sounds/:id", t.soundsUpdate)
	authenticated.DELETE("/sounds/:id", t.soundsDelete)
	authenticated.POST("/sounds/:id/play", t.soundsPlay)
	authenticated.POST("/sounds/:id/trim", t.soundsTrim)
	authenticated.POST("/sounds/:id/copy", t.soundsCopy)

	authenticated.GET("/events", t.eventsStream)

	authenticated.GET("/stats/scoreboard", t.statsScoreboard)
	authenticated.GET("/stats/plays", t.statsPlays)

	authenticated.GET("/channels", t.channelsList)
	authenticated.GET("/channels/:id", t.channelsGet)
	authenticated.POST("/channels", t.channelsCreate)
	authenticated.POST("/channels/:id", t.channelsUpdate)
	authenticated.DELETE("/channels/:id", t.channelsDelete)
	authenticated.POST("/channels/:id/connect", t.channelsConnect)
	authenticated.POST("/channels/disconnect", t.channelsDisconnect)
	authenticated.POST("/channels/:id/leave", t.channelsLeave)
	authenticated.GET("/channels/:id/invites", t.channelInvitesList)
	authenticated.POST("/channels/:id/invites", t.channelInvitesCreate)
	authenticated.DELETE("/channels/:id/invites/:inviteId", t.channelInvitesDelete)
	authenticated.POST("/invites/:code", t.channelInvitesRedeem)

	if cfg.WebAppPath != "" {
		registerWebApp(router, cfg.WebAppPath)
	}

	return router.Run(cfg.Address)
}
