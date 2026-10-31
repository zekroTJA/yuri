package models

import (
	"time"

	"github.com/zekrotja/yuri/pkg/database"
)

type ChannelRequest struct {
	Name string `json:"name" binding:"required"`
	// TagBlocklist contains tags of sounds which can not be played in the
	// channel. Tags are converted to lowercase and must only contain
	// letters, digits, underscores and dashes.
	TagBlocklist []string `json:"tag_blocklist"`
}

type ChannelUserResponse struct {
	ID     uint   `json:"id"`
	Handle string `json:"handle"`
}

type ChannelResponse struct {
	ID             uint                  `json:"id"`
	CreatedAt      time.Time             `json:"created_at"`
	UpdatedAt      time.Time             `json:"updated_at"`
	Name           string                `json:"name"`
	TagBlocklist   []string              `json:"tag_blocklist"`
	Owner          ChannelUserResponse   `json:"owner"`
	MemberCount    int                   `json:"member_count"`
	Members        []ChannelUserResponse `json:"members"`
	IsOwner        bool                  `json:"is_owner"`
	ConnectedUsers []ChannelUserResponse `json:"connected_users"`
}

type ChannelConnectionResponse struct {
	*ChannelResponse

	DisconnectedChannelId uint `json:"disconnected_channel_id,omitzero"`
}

func ChannelToResponse(c *database.Channel, userID uint, connectedUserIDs []uint) *ChannelResponse {
	members := make([]ChannelUserResponse, len(c.Members))
	for i, m := range c.Members {
		members[i] = ChannelUserResponse{ID: m.ID, Handle: m.Handle}
	}
	owner := ChannelUserResponse{}
	if c.Creator != nil {
		owner = ChannelUserResponse{ID: c.Creator.ID, Handle: c.Creator.Handle}
	}

	connectedSet := make(map[uint]struct{}, len(connectedUserIDs))
	for _, id := range connectedUserIDs {
		connectedSet[id] = struct{}{}
	}
	connectedUsers := make([]ChannelUserResponse, 0, len(connectedSet))
	if c.Creator != nil {
		if _, ok := connectedSet[c.Creator.ID]; ok {
			connectedUsers = append(connectedUsers, owner)
		}
	}
	for _, m := range members {
		if _, ok := connectedSet[m.ID]; ok {
			connectedUsers = append(connectedUsers, m)
		}
	}

	return &ChannelResponse{
		ID:             c.ID,
		CreatedAt:      c.CreatedAt,
		UpdatedAt:      c.UpdatedAt,
		Name:           c.Name,
		TagBlocklist:   c.TagBlocklist,
		Owner:          owner,
		MemberCount:    len(c.Members),
		Members:        members,
		IsOwner:        c.CreatorID == userID,
		ConnectedUsers: connectedUsers,
	}
}
