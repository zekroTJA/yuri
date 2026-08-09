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
)

const (
	sessionMaxAge      = 30 * 24 * time.Hour
	sessionCookieName  = "session"
	userKey            = "user"
	apiKeyHintLen      = 6
	apiKeyCharacterLen = 64
)

type sessionClaims struct {
	jwt.PublicClaims
	UserID uint `json:"user_id"`
}

type api struct {
	db         *database.Database
	storage    *storage.Storage
	encoder    *ffmpeg.FFMpeg
	jwtHandler jwt.Handler[sessionClaims]
	sseManager *sse.Manager

	connectionsMtx sync.RWMutex
	connections    map[uint]util.Set[uint]

	corsOrigin string
}

func Run(cfg *config.Api, storage *storage.Storage, encoder *ffmpeg.FFMpeg, db *database.Database) error {
	gin.SetMode(gin.ReleaseMode)

	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return err
	}

	t := &api{
		db:          db,
		storage:     storage,
		encoder:     encoder,
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

	authenticated := apiGroup.Group("/", t.requireAuth)

	authenticated.GET("/apikeys", t.apiKeysList)
	authenticated.POST("/apikeys", t.apiKeysCreate)
	authenticated.POST("/apikeys/:id", t.apiKeysUpdate)
	authenticated.DELETE("/apikeys/:id", t.apiKeysDelete)

	authenticated.GET("/sounds", t.soundsList)
	authenticated.POST("/sounds", t.soundsUpload)
	authenticated.GET("/sounds/:id", t.soundsGet)
	authenticated.POST("/sounds/:id", t.soundsUpdate)
	authenticated.DELETE("/sounds/:id", t.soundsDelete)
	authenticated.POST("/sounds/:id/play", t.soundsPlay)

	authenticated.GET("/events", t.eventsStream)

	authenticated.GET("/channels", t.channelsList)
	authenticated.GET("/channels/:id", t.channelsGet)
	authenticated.POST("/channels", t.channelsCreate)
	authenticated.POST("/channels/:id", t.channelsUpdate)
	authenticated.DELETE("/channels/:id", t.channelsDelete)
	authenticated.POST("/channels/:id/connect", t.channelsConnect)
	authenticated.POST("/channels/disconnect", t.channelsDisconnect)
	authenticated.GET("/channels/:id/invites", t.channelInvitesList)
	authenticated.POST("/channels/:id/invites", t.channelInvitesCreate)
	authenticated.DELETE("/channels/:id/invites/:inviteId", t.channelInvitesDelete)
	authenticated.POST("/invites/:code", t.channelInvitesRedeem)

	if cfg.WebAppPath != "" {
		registerWebApp(router, cfg.WebAppPath)
	}

	return router.Run(cfg.Address)
}
