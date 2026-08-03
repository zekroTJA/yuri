package api

import (
	"bytes"
	"crypto/sha512"
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

func (t *api) requireAuth(ctx *gin.Context) {
	token, err := ctx.Cookie(sessionCookieName)
	if err == http.ErrNoCookie {
		// No Cookie, check API Token
		tokenSplit := strings.Fields(ctx.GetHeader("Authorization"))
		if len(tokenSplit) != 2 || !strings.EqualFold(tokenSplit[0], "bearer") {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		token := tokenSplit[1]
		if len(token) < apiKeyHintLen {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		hint := token[:apiKeyHintLen]
		keys, err := t.db.ListAPIKeysByHint(hint)
		if err == database.ErrNotFound {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		if err != nil {
			slog.Error("failed getting API token from database", "hint", hint, "err", err)
			ctx.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			return
		}

		scopeForMethod := requiredScopeForMethod(ctx.Request.Method)

		for _, key := range keys {
			if !slices.Contains(key.Scopes, scopeForMethod) {
				continue
			}
			if bytes.Equal(hashApiKey(token, key.Salt), key.Hash) {
				ctx.Set(userKey, key.Owner)
				ctx.Next()
				return
			}
		}

		ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if err != nil {
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	claims, err := t.jwtHandler.DecodeAndValidate(token)
	if err != nil {
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := t.db.GetUserByID(claims.UserID)
	if err != nil {
		ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
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
