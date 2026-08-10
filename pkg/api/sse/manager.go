package sse

import (
	"log/slog"
	"slices"
	"sync"
)

const eventChannelBuffer = 64

type Manager struct {
	mtx sync.Mutex

	sessions map[uint][]Session
}

type Session struct {
	manager *Manager
	userId  uint
	ch      chan Event
}

func (t *Session) Channel() <-chan Event {
	return t.ch
}

func (t *Session) Close() (last bool) {
	t.manager.mtx.Lock()
	defer t.manager.mtx.Unlock()

	t.manager.sessions[t.userId] = slices.DeleteFunc(t.manager.sessions[t.userId], func(v Session) bool {
		return v.ch == t.ch
	})

	close(t.ch)

	nSessions := len(t.manager.sessions[t.userId])

	slog.Debug("SSE: session closed", "userId", t.userId, "active", nSessions)

	if nSessions == 0 {
		delete(t.manager.sessions, t.userId)
		return true
	}

	return false
}

func NewManager() *Manager {
	return &Manager{
		sessions: make(map[uint][]Session),
	}
}

func (t *Manager) Subscribe(userId uint) Session {
	t.mtx.Lock()
	defer t.mtx.Unlock()

	session := Session{
		manager: t,
		userId:  userId,
		ch:      make(chan Event, eventChannelBuffer),
	}

	t.sessions[userId] = append(t.sessions[userId], session)

	slog.Debug("SSE: session subscribed", "userId", userId, "active", len(t.sessions[userId]))

	return session
}

func (t *Manager) Send(event Event, userIds []uint) {
	t.mtx.Lock()
	defer t.mtx.Unlock()

	for _, userId := range userIds {
		sessions, ok := t.sessions[userId]
		if !ok {
			continue
		}
		for _, session := range sessions {
			session.ch <- event
		}
	}
}

func (t *Manager) Broadcast(event Event) {
	t.mtx.Lock()
	defer t.mtx.Unlock()

	for _, sessions := range t.sessions {
		for _, session := range sessions {
			session.ch <- event
		}
	}
}
