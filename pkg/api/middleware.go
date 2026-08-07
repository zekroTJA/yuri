package api

import (
	"crypto/sha512"
	"crypto/subtle"
	"log/slog"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zekrotja/yuri/pkg/database"
)

func (t *api) accessLogger(ctx *gin.Context) {
	start := time.Now()

	ctx.Next()

	slog.Info("request",
		"method", ctx.Request.Method,
		"path", ctx.Request.URL.Path,
		"status", ctx.Writer.Status(),
		"duration", time.Since(start),
	)
}

func (t *api) corsMiddleware(ctx *gin.Context) {
	if t.corsOrigin == "" {
		ctx.Next()
		return
	}

	ctx.Header("Access-Control-Allow-Origin", t.corsOrigin)
	ctx.Header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
	ctx.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
	ctx.Header("Access-Control-Allow-Credentials", "true")

	if ctx.Request.Method == http.MethodOptions {
		ctx.AbortWithStatus(http.StatusNoContent)
		return
	}

	ctx.Next()
}

func (t *api) requireAuth(ctx *gin.Context) {
	token, err := ctx.Cookie(sessionCookieName)
	if err == http.ErrNoCookie {
		// No Cookie, check API Token
		tokenSplit := strings.Fields(ctx.GetHeader("Authorization"))
		if len(tokenSplit) != 2 || !strings.EqualFold(tokenSplit[0], "bearer") {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, ErrUnauthorized)
			return
		}

		token := tokenSplit[1]
		if len(token) < apiKeyHintLen {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, ErrUnauthorized)
			return
		}

		hint := token[:apiKeyHintLen]
		keys, err := t.db.ListAPIKeysByHint(hint)
		if err == database.ErrNotFound {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, ErrUnauthorized)
			return
		}
		if err != nil {
			slog.Error("failed getting API token from database", "hint", hint, "err", err)
			ctx.AbortWithStatusJSON(http.StatusInternalServerError, ErrInternal)
			return
		}

		scopeForMethod := requiredScopeForMethod(ctx.Request.Method)

		for _, key := range keys {
			if !slices.Contains(key.Scopes, scopeForMethod) {
				continue
			}
			if subtle.ConstantTimeCompare(hashApiKey(token, key.Salt), key.Hash) == 1 {
				if key.Owner == nil {
					ctx.AbortWithStatusJSON(http.StatusUnauthorized, ErrUnauthorized)
					return
				}
				ctx.Set(userKey, key.Owner)
				ctx.Next()
				return
			}
		}

		ctx.AbortWithStatusJSON(http.StatusUnauthorized, ErrUnauthorized)
		return
	}

	if err != nil {
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, ErrUnauthorized)
		return
	}

	claims, err := t.jwtHandler.DecodeAndValidate(token)
	if err != nil {
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, ErrUnauthorized)
		return
	}

	user, err := t.db.GetUserByID(claims.UserID)
	if err != nil {
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, ErrUnauthorized)
		return
	}
	if user == nil {
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, ErrUnauthorized)
		return
	}

	ctx.Set(userKey, user)
	ctx.Next()
}

func hashApiKey(key string, salt []byte) []byte {
	h := sha512.New()
	h.Write(salt)
	h.Write([]byte(key))
	return h.Sum(nil)
}

func requiredScopeForMethod(method string) database.Scope {
	switch method {
	case http.MethodGet:
		return database.ScopeRead
	case http.MethodPost:
		return database.ScopeWrite
	case http.MethodDelete:
		return database.ScopeDelete
	default:
		panic("invalid method for scope")
	}
}
