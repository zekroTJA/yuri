package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (t *api) requireAuth(ctx *gin.Context) {
	token, err := ctx.Cookie(sessionCookieName)
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
