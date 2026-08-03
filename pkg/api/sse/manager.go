package sse

import "sync"

const eventChannelBuffer = 64

type Manager struct {
	mtx sync.Mutex

	sessions map[uint]chan Event
}

func NewManager() *Manager {
	return &Manager{
		sessions: make(map[uint]chan Event),
	}
}

func (t *Manager) Events(userID uint) <-chan Event {
	t.mtx.Lock()
	defer t.mtx.Unlock()

	if ch, ok := t.sessions[userID]; ok {
		return ch
	}

	ch := make(chan Event, eventChannelBuffer)
	t.sessions[userID] = ch

	return ch
}

func (t *Manager) CloseEvents(userID uint) {
	t.mtx.Lock()
	defer t.mtx.Unlock()

	ch, ok := t.sessions[userID]
	if !ok {
		return
	}

	close(ch)
	delete(t.sessions, userID)
}

func (t *Manager) Send(event Event, userIds []uint) {
	for _, userId := range userIds {
		ch, ok := t.sessions[userId]
		if !ok {
			continue
		}
		ch <- event
	}
}

func (t *Manager) Broadcast(event Event) {
	t.mtx.Lock()
	defer t.mtx.Unlock()

	for _, ch := range t.sessions {
		ch <- event
	}
}
