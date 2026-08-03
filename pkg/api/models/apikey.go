package models

import (
	"time"

	"github.com/zekrotja/yuri/pkg/database"
)

type APIKeyCreateRequest struct {
	Name   string           `json:"name" binding:"required"`
	Scopes []database.Scope `json:"scopes" binding:"required"`
}

type APIKeyUpdateRequest struct {
	Name string `json:"name" binding:"required"`
}

type APIKeyResponse struct {
	ID        uint             `json:"id"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
	Name      string           `json:"name"`
	Scopes    []database.Scope `json:"scopes"`
	OwnerID   uint             `json:"owner_id"`
}

type APIKeyCreateResponse struct {
	*APIKeyResponse

	Key string `json:"key"`
}

func APIKeyToResponse(k *database.APIKey) *APIKeyResponse {
	return &APIKeyResponse{
		ID:        k.ID,
		CreatedAt: k.CreatedAt,
		UpdatedAt: k.UpdatedAt,
		Name:      k.Name,
		Scopes:    k.Scopes,
		OwnerID:   k.OwnerID,
	}
}
