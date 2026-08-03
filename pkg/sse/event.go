package sse

type EventType string

const (
	EventTypePlay = EventType("play")
)

type EventDataPlay struct {
	Sound uint `json:"sound"`
}

type Event struct {
	Event string
	Data  any
}
