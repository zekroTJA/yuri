package api

import (
	"log/slog"
	"net/http"
	"slices"
	"strings"

	"github.com/alexedwards/argon2id"
	"github.com/gin-gonic/gin"
	"github.com/zekrotja/yuri/pkg/api/models"
	"github.com/zekrotja/yuri/pkg/api/sse"
	"github.com/zekrotja/yuri/pkg/database"
)

// authRegister godoc
//
//	@Summary		Register
//	@Description	Creates a new user account.
//	@Tags			Auth
//	@Accept			json
//	@Produce		json
//	@Param			body	body		models.AuthRequest	true	"Credentials"
//	@Success		201		{object}	models.AuthRegisterResponse
//	@Failure		400		{object}	api.ErrorResponse
//	@Failure		409		{object}	api.ErrorResponse
//	@Failure		500		{object}	api.ErrorResponse
//	@Router			/auth/register [post]
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

	ctx.JSON(http.StatusCreated, models.AuthRegisterResponse{
		ID:     user.ID,
		Handle: user.Handle,
	})
}

// authLogin godoc
//
//	@Summary		Login
//	@Description	Authenticates the user and sets the "session" cookie.
//	@Tags			Auth
//	@Accept			json
//	@Produce		json
//	@Param			body	body	models.AuthRequest	true	"Credentials"
//	@Success		204
//	@Failure		400	{object}	api.ErrorResponse
//	@Failure		401	{object}	api.ErrorResponse
//	@Failure		500	{object}	api.ErrorResponse
//	@Router			/auth/login [post]
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

// authChangePassword godoc
//
//	@Summary		Change password
//	@Description	Changes the password of the authenticated user. The current password must be provided.
//	@Tags			Auth
//	@Accept			json
//	@Produce		json
//	@Security		ApiKeyAuth
//	@Param			body	body	models.AuthChangePasswordRequest	true	"Current and new password"
//	@Success		204
//	@Failure		400	{object}	api.ErrorResponse
//	@Failure		401	{object}	api.ErrorResponse
//	@Failure		403	{object}	api.ErrorResponse
//	@Failure		500	{object}	api.ErrorResponse
//	@Router			/auth/password [post]
func (t *api) authChangePassword(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	var req models.AuthChangePasswordRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidRequestBody)
		return
	}

	if len(req.NewPassword) < 6 {
		ctx.JSON(http.StatusBadRequest, ErrPasswordTooShort)
		return
	}

	// Responding with 403 instead of 401 here, because the user is
	// authenticated and only the provided current password is wrong.
	match, err := argon2id.ComparePasswordAndHash(req.CurrentPassword, string(user.PasswordHash))
	if err != nil || !match {
		ctx.JSON(http.StatusForbidden, ErrInvalidPassword)
		return
	}

	hash, err := argon2id.CreateHash(req.NewPassword, argon2id.DefaultParams)
	if err != nil {
		slog.Error("failed hashing password", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	if err = t.db.UpdateUserPassword(user.ID, []byte(hash)); err != nil {
		slog.Error("failed updating user password in database", "user", user.ID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	ctx.Status(http.StatusNoContent)
}

// authDeleteAccount godoc
//
//	@Summary		Delete account
//	@Description	Permanently deletes the account of the authenticated user including all of their API keys and channels. Sounds uploaded by the user are kept. The current password must be provided. Requires the "delete" scope when using an API key.
//	@Tags			Auth
//	@Accept			json
//	@Produce		json
//	@Security		ApiKeyAuth
//	@Param			body	body	models.AuthDeleteAccountRequest	true	"Current password"
//	@Success		204
//	@Failure		400	{object}	api.ErrorResponse
//	@Failure		401	{object}	api.ErrorResponse
//	@Failure		403	{object}	api.ErrorResponse
//	@Failure		500	{object}	api.ErrorResponse
//	@Router			/auth/account [delete]
func (t *api) authDeleteAccount(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	var req models.AuthDeleteAccountRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidRequestBody)
		return
	}

	match, err := argon2id.ComparePasswordAndHash(req.Password, string(user.PasswordHash))
	if err != nil || !match {
		ctx.JSON(http.StatusForbidden, ErrInvalidPassword)
		return
	}

	channels, err := t.db.ListChannelsByUser(user.ID)
	if err != nil {
		slog.Error("failed listing channels of user", "user", user.ID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	if err = t.db.DeleteUser(user.ID); err != nil {
		slog.Error("failed deleting user from database", "user", user.ID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	t.connectionsMtx.Lock()
	defer t.connectionsMtx.Unlock()

	for _, channel := range channels {
		if channel.CreatorID == user.ID {
			delete(t.connections, channel.ID)
			t.sseManager.Send(sse.Event{
				Event: sse.EventTypeChannelDelete,
				Data: sse.EventDataChannelDelete{
					ChannelId: channel.ID,
				},
			}, channel.AssociatedUserIds())
			continue
		}

		t.connections[channel.ID].Remove(user.ID)
		channel.Members = slices.DeleteFunc(channel.Members, func(member *database.User) bool {
			return member.ID == user.ID
		})
		t.sseManager.Send(sse.Event{
			Event: sse.EventTypeChannelUpdate,
			Data: sse.EventDataChannelUpdate{
				Channel: models.ChannelToResponse(channel, user.ID, t.connections[channel.ID].Collect()),
			},
		}, channel.AssociatedUserIds())
	}

	ctx.SetCookie(sessionCookieName, "", -1, "/", "", false, true)
	ctx.Status(http.StatusNoContent)
}
