package models

import (
	"time"

	"github.com/zekrotja/yuri/pkg/database"
)

type ChannelInviteCreateRequest struct {
	MaxActivations uint       `json:"max_activations"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
}

type ChannelInviteResponse struct {
	ID             uint       `json:"id"`
	CreatedAt      time.Time  `json:"created_at"`
	Code           string     `json:"code"`
	Activations    uint       `json:"activations"`
	MaxActivations uint       `json:"max_activations"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
	ChannelID      uint       `json:"channel_id"`
	CreatorID      uint       `json:"creator_id"`
}

func ChannelInviteToResponse(i *database.ChannelInvite) *ChannelInviteResponse {
	return &ChannelInviteResponse{
		ID:             i.ID,
		CreatedAt:      i.CreatedAt,
		Code:           i.Code,
		Activations:    i.Activations,
		MaxActivations: i.MaxActivations,
		ExpiresAt:      i.ExpiresAt,
		ChannelID:      i.ChannelID,
		CreatorID:      i.CreatorID,
	}
}
