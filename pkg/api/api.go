package api

import (
	"crypto/rand"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zekrotja/jwt"
	"github.com/zekrotja/yuri/pkg/database"
)

const (
	sessionMaxAge     = 30 * 24 * time.Hour
	sessionCookieName = "session"
	userKey           = "user"
)

type sessionClaims struct {
	jwt.PublicClaims
	UserID uint `json:"user_id"`
}

type api struct {
	db         *database.Database
	jwtHandler jwt.Handler[sessionClaims]
}

func Run(addr string, db *database.Database) error {
	gin.SetMode(gin.ReleaseMode)

	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return err
	}

	t := &api{
		db:         db,
		jwtHandler: jwt.NewHandler[sessionClaims](jwt.NewHmacSha256(secret)),
	}

	router := gin.New()
	router.Use(gin.Recovery())

	apiGroup := router.Group("/api/v1")
	apiGroup.POST("/auth/register", t.authRegister)
	apiGroup.POST("/auth/login", t.authLogin)

	return router.Run(addr)
}
