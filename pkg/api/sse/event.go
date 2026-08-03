package sse

import "github.com/zekrotja/yuri/pkg/api/models"

type EventType string

const (
	EventTypePlay          = EventType("play")
	EventTypeChannelUpdate = EventType("channel-update")
	EventTypeChannelDelete = EventType("channel-delete")
	EventTypeSoundCreate   = EventType("sound-create")
	EventTypeSoundUpdate   = EventType("sound-update")
	EventTypeSoundDelete   = EventType("sound-delete")
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

type EventDataSoundCreate struct {
	Sound *models.SoundResponse
}

type EventDataSoundUpdate struct {
	Sound *models.SoundResponse
}

type EventDataSoundDelete struct {
	SoundId uint `json:"sound_id"`
}

type Event struct {
	Event EventType
	Data  any
}
