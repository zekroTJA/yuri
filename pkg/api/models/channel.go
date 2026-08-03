package models

import (
	"time"

	"github.com/zekrotja/yuri/pkg/database"
)

type ChannelRequest struct {
	Name string `json:"name" binding:"required"`
}

type ChannelUserResponse struct {
	ID     uint   `json:"id"`
	Handle string `json:"handle"`
}

type ChannelResponse struct {
	ID          uint                  `json:"id"`
	CreatedAt   time.Time             `json:"created_at"`
	UpdatedAt   time.Time             `json:"updated_at"`
	Name        string                `json:"name"`
	Owner       ChannelUserResponse   `json:"owner"`
	MemberCount int                   `json:"member_count"`
	Members     []ChannelUserResponse `json:"members"`
	IsOwner     bool                  `json:"is_owner"`
}

func ChannelToResponse(c *database.Channel, userID uint) *ChannelResponse {
	members := make([]ChannelUserResponse, len(c.Members))
	for i, m := range c.Members {
		members[i] = ChannelUserResponse{ID: m.ID, Handle: m.Handle}
	}
	owner := ChannelUserResponse{}
	if c.Creator != nil {
		owner = ChannelUserResponse{ID: c.Creator.ID, Handle: c.Creator.Handle}
	}
	return &ChannelResponse{
		ID:          c.ID,
		CreatedAt:   c.CreatedAt,
		UpdatedAt:   c.UpdatedAt,
		Name:        c.Name,
		Owner:       owner,
		MemberCount: len(c.Members),
		Members:     members,
		IsOwner:     c.CreatorID == userID,
	}
}
