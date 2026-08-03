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

func (t *Manager) Events(channelId uint, uid uint) <-chan Event {
	ch := t.getOrCreateChannel(channelId)
	return ch.events(uid)
}

func (t *Manager) CloseEvents(channelId uint, uid uint) {
	ch := t.getOrCreateChannel(channelId)
	ch.close(uid)
}

func (t *Manager) Broadcast(channelId uint, event Event) {
	t.mtx.Lock()
	defer t.mtx.Unlock()

	ch := t.getOrCreateChannel(channelId)
	ch.broadcast(event)
}

func (t *Manager) getOrCreateChannel(channelId uint) *channel {
	ch, ok := t.channels[channelId]
	if !ok {
		ch = newChannel()
		t.channels[channelId] = ch
	}
	return ch
}
