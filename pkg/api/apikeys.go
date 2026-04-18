package api

import (
	"crypto/rand"
	"net/http"
	"slices"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zekrotja/yuri/pkg/database"
)

type apiKeyCreateRequest struct {
	Name   string           `json:"name" binding:"required"`
	Scopes []database.Scope `json:"scopes" binding:"required"`
}

type apiKeyUpdateRequest struct {
	Name string `json:"name" binding:"required"`
}

type apiKeyResponse struct {
	ID        uint             `json:"id"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
	Name      string           `json:"name"`
	Scopes    []database.Scope `json:"scopes"`
	OwnerID   uint             `json:"owner_id"`
}

type apiKeyCreateResponse struct {
	apiKeyResponse
	Key string `json:"key"`
}

func apiKeyToResponse(k *database.APIKey) apiKeyResponse {
	return apiKeyResponse{
		ID:        k.ID,
		CreatedAt: k.CreatedAt,
		UpdatedAt: k.UpdatedAt,
		Name:      k.Name,
		Scopes:    k.Scopes,
		OwnerID:   k.OwnerID,
	}
}

func (t *api) apiKeysCreate(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	var req apiKeyCreateRequest
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

	rawKey := generateAPIKey()

	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	hash := hashApiKey(rawKey, salt)
	hint := rawKey[:apiKeyHintLen]

	key, err := t.db.CreateAPIKey(req.Name, hash, salt, hint, req.Scopes, user.ID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create api key"})
		return
	}

	ctx.JSON(http.StatusCreated, apiKeyCreateResponse{
		apiKeyResponse: apiKeyToResponse(key),
		Key:            rawKey,
	})
}

func (t *api) apiKeysList(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	keys, err := t.db.ListAPIKeysByOwner(user.ID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	resp := make([]apiKeyResponse, len(keys))
	for i, k := range keys {
		resp[i] = apiKeyToResponse(k)
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

	var req apiKeyUpdateRequest
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
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if key.OwnerID != user.ID {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	key, err = t.db.UpdateAPIKey(uint(id), req.Name)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update api key"})
		return
	}

	ctx.JSON(http.StatusOK, apiKeyToResponse(key))
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
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if key.OwnerID != user.ID {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	if err = t.db.DeleteAPIKey(uint(id)); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete api key"})
		return
	}

	ctx.Status(http.StatusNoContent)
}

func generateAPIKey() string {
	src := make([]byte, apiKeyCharacterLen)
	rand.Read(src)
	for i := range src {
		src[i] = apiKeyCharacterSet[src[i]%32]
	}
	return string(src)
}
