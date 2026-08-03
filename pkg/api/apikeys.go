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

func (t *api) apiKeysCreate(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	var req models.APIKeyCreateRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for _, scope := range req.Scopes {
		if !slices.Contains(database.Scopes, scope) {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid scope"})
			return
		}
	}

	rawKey := util.GenerateRandomString(apiKeyCharacterLen, util.DefaultCharset)

	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		slog.Error("failed generating random bytes", "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	hash := hashApiKey(rawKey, salt)
	hint := rawKey[:apiKeyHintLen]

	key, err := t.db.CreateAPIKey(req.Name, hash, salt, hint, req.Scopes, user.ID)
	if err != nil {
		slog.Error("failed creating api key in database", "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create api key"})
		return
	}

	ctx.JSON(http.StatusCreated, models.APIKeyCreateResponse{
		APIKeyResponse: models.APIKeyToResponse(key),
		Key:            rawKey,
	})
}

func (t *api) apiKeysList(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	keys, err := t.db.ListAPIKeysByOwner(user.ID)
	if err != nil {
		slog.Error("failed listing api keys from database", "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	resp := make([]*models.APIKeyResponse, len(keys))
	for i, k := range keys {
		resp[i] = models.APIKeyToResponse(k)
	}

	ctx.JSON(http.StatusOK, resp)
}

func (t *api) apiKeysUpdate(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.APIKeyUpdateRequest
	if err = ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	key, err := t.db.GetAPIKeyByID(uint(id))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "api key not found"})
		return
	}
	if err != nil {
		slog.Error("failed getting api key from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if key.OwnerID != user.ID {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	key, err = t.db.UpdateAPIKey(uint(id), req.Name)
	if err != nil {
		slog.Error("failed updating api key in database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update api key"})
		return
	}

	ctx.JSON(http.StatusOK, models.APIKeyToResponse(key))
}

func (t *api) apiKeysDelete(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	key, err := t.db.GetAPIKeyByID(uint(id))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "api key not found"})
		return
	}
	if err != nil {
		slog.Error("failed getting api key from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if key.OwnerID != user.ID {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	if err = t.db.DeleteAPIKey(uint(id)); err != nil {
		slog.Error("failed deleting api key from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete api key"})
		return
	}

	ctx.Status(http.StatusNoContent)
}
