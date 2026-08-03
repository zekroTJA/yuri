package api

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/zekrotja/yuri/pkg/api/models"
	"github.com/zekrotja/yuri/pkg/api/sse"
	"github.com/zekrotja/yuri/pkg/database"
)

func (t *api) eventsStream(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	eventChan := t.sseManager.Events(user.ID)
	defer func() {
		t.sseManager.CloseEvents(user.ID)
		t.connectionsMtx.Lock()
		defer t.connectionsMtx.RUnlock()
		for chanId, conns := range t.connections {
			if conns.Remove(user.ID) {
				channel, err := t.db.GetChannelByID(chanId)
				if err != nil {
					slog.Error("failed getting channel", "err", err.Error(), "id", chanId)
					return
				}
				connectedIds := conns.Collect()
				t.sseManager.Send(sse.Event{
					Event: sse.EventTypeChannelUpdate,
					Data: sse.EventDataChannelUpdate{
						Channel: models.ChannelToResponse(channel, user.ID, connectedIds),
					},
				}, connectedIds)
				return
			}
		}
	}()

	ctx.Header("Content-Type", "text/event-stream")
	ctx.Header("Cache-Control", "no-cache")
	ctx.Header("Connection", "keep-alive")

	rc := http.NewResponseController(ctx.Writer)
	for {
		select {
		case <-ctx.Done():
			return
		case event := <-eventChan:
			dataBytes, err := json.Marshal(event.Data)
			if err != nil {
				slog.Error("failed encoding event data", "err", err.Error(),
					"eventData", fmt.Sprintf("%#v", event.Data), "userId", user.ID)
				continue
			}
			_, err = fmt.Fprintf(ctx.Writer, "event: %s\n", event.Event)
			if err != nil {
				slog.Error("failed writing sse event", "err", err.Error(), "userId", user.ID)
				return
			}
			_, err = fmt.Fprintf(ctx.Writer, "data: %s\n\n", string(dataBytes))
			if err != nil {
				slog.Error("failed writing sse data", "err", err.Error(), "userId", user.ID)
				return
			}
			if err = rc.Flush(); err != nil {
				slog.Error("failed flusing sse writer", "err", err.Error(), "userId", user.ID)
				return
			}
		}
	}
}
