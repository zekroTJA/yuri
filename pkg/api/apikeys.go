package api

import (
	"crypto/rand"
	"log/slog"
	"net/http"
	"slices"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/zekrotja/yuri/pkg/api/models"
	"github.com/zekrotja/yuri/pkg/database"
	"github.com/zekrotja/yuri/pkg/util"
)

// apiKeysCreate godoc
//
//	@Summary		Create API key
//	@Description	Creates a new API key. The raw key is only returned once in the response. Requires the "write" scope when using an API key.
//	@Tags			API Keys
//	@Accept			json
//	@Produce		json
//	@Security		ApiKeyAuth
//	@Param			body	body		models.APIKeyCreateRequest	true	"API key"
//	@Success		201		{object}	models.APIKeyCreateResponse
//	@Failure		400		{object}	api.ErrorResponse
//	@Failure		401		{object}	api.ErrorResponse
//	@Failure		500		{object}	api.ErrorResponse
//	@Router			/apikeys [post]
func (t *api) apiKeysCreate(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	var req models.APIKeyCreateRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidRequestBody)
		return
	}

	for _, scope := range req.Scopes {
		if !slices.Contains(database.Scopes, scope) {
			ctx.JSON(http.StatusBadRequest, ErrInvalidScope)
			return
		}
	}

	rawKey := util.GenerateRandomString(apiKeyCharacterLen, util.DefaultCharset)

	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		slog.Error("failed generating random bytes", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	hash := hashApiKey(rawKey, salt)
	hint := rawKey[:apiKeyHintLen]

	key, err := t.db.CreateAPIKey(req.Name, hash, salt, hint, req.Scopes, user.ID)
	if err != nil {
		slog.Error("failed creating api key in database", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	ctx.JSON(http.StatusCreated, models.APIKeyCreateResponse{
		APIKeyResponse: models.APIKeyToResponse(key),
		Key:            rawKey,
	})
}

// apiKeysList godoc
//
//	@Summary		List API keys
//	@Description	Lists all API keys of the authenticated user. Requires the "read" scope when using an API key.
//	@Tags			API Keys
//	@Produce		json
//	@Security		ApiKeyAuth
//	@Success		200	{array}		models.APIKeyResponse
//	@Failure		401	{object}	api.ErrorResponse
//	@Failure		500	{object}	api.ErrorResponse
//	@Router			/apikeys [get]
func (t *api) apiKeysList(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	keys, err := t.db.ListAPIKeysByOwner(user.ID)
	if err != nil {
		slog.Error("failed listing api keys from database", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	resp := make([]*models.APIKeyResponse, len(keys))
	for i, k := range keys {
		resp[i] = models.APIKeyToResponse(k)
	}

	ctx.JSON(http.StatusOK, resp)
}

// apiKeysUpdate godoc
//
//	@Summary		Update API key
//	@Description	Updates the name of an API key. Requires the "write" scope when using an API key.
//	@Tags			API Keys
//	@Accept			json
//	@Produce		json
//	@Security		ApiKeyAuth
//	@Param			id		path		int							true	"API key ID"
//	@Param			body	body		models.APIKeyUpdateRequest	true	"API key update"
//	@Success		200		{object}	models.APIKeyResponse
//	@Failure		400		{object}	api.ErrorResponse
//	@Failure		401		{object}	api.ErrorResponse
//	@Failure		403		{object}	api.ErrorResponse
//	@Failure		404		{object}	api.ErrorResponse
//	@Failure		500		{object}	api.ErrorResponse
//	@Router			/apikeys/{id} [post]
func (t *api) apiKeysUpdate(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidID)
		return
	}

	var req models.APIKeyUpdateRequest
	if err = ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidRequestBody)
		return
	}

	key, err := t.db.GetAPIKeyByID(uint(id))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrAPIKeyNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting api key from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	if key.OwnerID != user.ID {
		ctx.JSON(http.StatusForbidden, ErrForbidden)
		return
	}

	key, err = t.db.UpdateAPIKey(uint(id), req.Name)
	if err != nil {
		slog.Error("failed updating api key in database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	ctx.JSON(http.StatusOK, models.APIKeyToResponse(key))
}

// apiKeysDelete godoc
//
//	@Summary		Delete API key
//	@Description	Deletes an API key. Requires the "delete" scope when using an API key.
//	@Tags			API Keys
//	@Produce		json
//	@Security		ApiKeyAuth
//	@Param			id	path	int	true	"API key ID"
//	@Success		204
//	@Failure		400	{object}	api.ErrorResponse
//	@Failure		401	{object}	api.ErrorResponse
//	@Failure		403	{object}	api.ErrorResponse
//	@Failure		404	{object}	api.ErrorResponse
//	@Failure		500	{object}	api.ErrorResponse
//	@Router			/apikeys/{id} [delete]
func (t *api) apiKeysDelete(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidID)
		return
	}

	key, err := t.db.GetAPIKeyByID(uint(id))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrAPIKeyNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting api key from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	if key.OwnerID != user.ID {
		ctx.JSON(http.StatusForbidden, ErrForbidden)
		return
	}

	if err = t.db.DeleteAPIKey(uint(id)); err != nil {
		slog.Error("failed deleting api key from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	ctx.Status(http.StatusNoContent)
}
