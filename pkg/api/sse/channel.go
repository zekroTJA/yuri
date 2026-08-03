package sse

type channel struct {
	sessions map[uint]chan Event
}

func newChannel() *channel {
	return &channel{
		sessions: make(map[uint]chan Event),
	}
}

func (t *channel) events(uid uint) <-chan Event {
	if ch, ok := t.sessions[uid]; ok {
		return ch
	}

	ch := make(chan Event, 64)
	t.sessions[uid] = ch

	return ch
}

func (t *channel) close(uid uint) {
	ch, ok := t.sessions[uid]
	if !ok {
		return
	}

	close(ch)
	delete(t.sessions, uid)
}

func (t *channel) broadcast(event Event) {
	for _, ch := range t.sessions {
		ch <- event
	}
}
