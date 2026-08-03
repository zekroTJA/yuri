package sse

import "sync"

type Manager struct {
	mtx      sync.Mutex
	channels map[uint]*channel
}

func NewManager() *Manager {
	return &Manager{
		channels: make(map[uint]*channel),
	}
}

func (t *Manager) Events(chanId uint, uid uint) <-chan Event {
	ch := t.getOrCreateChannel(chanId)
	return ch.events(uid)
}

func (t *Manager) CloseEvents(chanId uint, uid uint) {
	ch := t.getOrCreateChannel(chanId)
	ch.close(uid)
}

func (t *Manager) Broadcast(id uint, event Event) {
	t.mtx.Lock()
	defer t.mtx.Unlock()

	ch := t.getOrCreateChannel(id)
	ch.broadcast(event)
}

func (t *Manager) getOrCreateChannel(id uint) *channel {
	ch, ok := t.channels[id]
	if !ok {
		ch = newChannel()
		t.channels[id] = ch
	}
	return ch
}
