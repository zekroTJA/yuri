package sse

import "github.com/zekrotja/yuri/pkg/api/models"

type EventType string

const (
	EventTypePlay          = EventType("play")
	EventTypeChannelUpdate = EventType("channel-update")
	EventTypeChannelDelete = EventType("channel-delete")
	EventTypeChannelJoined = EventType("channel-joined")
)

type EventDataPlay struct {
	Sound uint `json:"sound"`
}

type EventDataChannelUpdate struct {
	Channel *models.ChannelResponse
}

type EventDataChannelDelete struct {
	ChannelId uint `json:"channel_id"`
}

type EventDataChannelJoined struct {
	ChannelId uint `json:"channel_id"`
	User      *models.ChannelUserResponse
}

type Event struct {
	Event EventType
	Data  any
}
