package api

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/alexedwards/argon2id"
	"github.com/gin-gonic/gin"
	"github.com/zekrotja/yuri/pkg/api/models"
)

func (t *api) authRegister(ctx *gin.Context) {
	var req models.AuthRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidRequestBody)
		return
	}

	if len(req.Password) < 6 {
		ctx.JSON(http.StatusBadRequest, ErrPasswordTooShort)
		return
	}

	hash, err := argon2id.CreateHash(req.Password, argon2id.DefaultParams)
	if err != nil {
		slog.Error("failed hashing password", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	handle := strings.ToLower(req.Handle)

	user, err := t.db.GetUserByHandle(handle)
	if err != nil {
		slog.Error("failed checking handle availability", "handle", handle, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}
	if user != nil {
		ctx.JSON(http.StatusConflict, ErrHandleConflict)
		return
	}

	user, err = t.db.CreateUser(handle, []byte(hash))
	if err != nil {
		slog.Error("failed creating user in database", "handle", handle, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{"id": user.ID, "handle": user.Handle})
}

func (t *api) authLogin(ctx *gin.Context) {
	var req models.AuthRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidRequestBody)
		return
	}

	user, err := t.db.GetUserByHandle(req.Handle)
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, ErrInvalidCredentials)
		return
	}
	if user == nil {
		ctx.JSON(http.StatusUnauthorized, ErrInvalidCredentials)
		return
	}

	match, err := argon2id.ComparePasswordAndHash(req.Password, string(user.PasswordHash))
	if err != nil || !match {
		ctx.JSON(http.StatusUnauthorized, ErrInvalidCredentials)
		return
	}

	claims := sessionClaims{}
	claims.UserID = user.ID
	claims.SetIat()
	claims.SetExpDuration(sessionMaxAge)

	token, err := t.jwtHandler.EncodeAndSign(claims)
	if err != nil {
		slog.Error("failed creating session token", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	ctx.SetCookie(sessionCookieName, token, int(sessionMaxAge.Seconds()), "/", "", false, true)
	ctx.Status(http.StatusNoContent)
}
