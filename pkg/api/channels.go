package api

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/zekrotja/yuri/pkg/api/models"
	"github.com/zekrotja/yuri/pkg/api/sse"
	"github.com/zekrotja/yuri/pkg/database"
)

func (t *api) channelsCreate(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	var req models.ChannelRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	channel, err := t.db.CreateChannel(req.Name, user.ID)
	if err != nil {
		slog.Error("failed creating channel in database", "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create channel"})
		return
	}

	channel, err = t.db.GetChannelByID(channel.ID)
	if err != nil {
		slog.Error("failed getting channel from database", "id", channel.ID, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	ctx.JSON(http.StatusCreated, models.ChannelToResponse(channel, user.ID))
}

func (t *api) channelsList(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	channels, err := t.db.ListChannelsByUser(user.ID)
	if err != nil {
		slog.Error("failed listing channels from database", "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	resp := make([]*models.ChannelResponse, len(channels))
	for i, c := range channels {
		resp[i] = models.ChannelToResponse(c, user.ID)
	}

	ctx.JSON(http.StatusOK, resp)
}

func (t *api) channelsGet(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	channel, err := t.db.GetChannelByID(uint(id))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if channel.CreatorID != user.ID && !channelHasMember(channel, user.ID) {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	ctx.JSON(http.StatusOK, models.ChannelToResponse(channel, user.ID))
}

func (t *api) channelsUpdate(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.ChannelRequest
	if err = ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	channel, err := t.db.GetChannelByID(uint(id))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if channel.CreatorID != user.ID {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	channel, err = t.db.UpdateChannel(uint(id), req.Name)
	if err != nil {
		slog.Error("failed updating channel in database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update channel"})
		return
	}

	channel, err = t.db.GetChannelByID(uint(id))
	if err != nil {
		slog.Error("failed getting channel from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	channelResponse := models.ChannelToResponse(channel, user.ID)

	t.sseManager.Broadcast(channel.ID, sse.Event{
		Event: sse.EventTypeChannelUpdate,
		Data: sse.EventDataChannelUpdate{
			Channel: channelResponse,
		},
	})

	ctx.JSON(http.StatusOK, channelResponse)
}

func (t *api) channelsDelete(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	channel, err := t.db.GetChannelByID(uint(id))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if channel.CreatorID != user.ID {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	if err = t.db.DeleteChannel(uint(id)); err != nil {
		slog.Error("failed deleting channel from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete channel"})
		return
	}

	t.sseManager.Broadcast(channel.ID, sse.Event{
		Event: sse.EventTypeChannelDelete,
		Data: sse.EventDataChannelDelete{
			ChannelId: channel.ID,
		},
	})

	ctx.Status(http.StatusNoContent)
}

func (t *api) channelsEvents(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	channel, err := t.db.GetChannelByID(uint(id))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if user.ID != channel.CreatorID && !channelHasMember(channel, user.ID) {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	eventChan := t.sseManager.Events(channel.ID, user.ID)
	defer func() {
		t.sseManager.CloseEvents(channel.ID, user.ID)
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
					"eventData", fmt.Sprintf("%#v", event.Data), "chanId", channel.ID, "userId", user.ID)
				continue
			}
			_, err = fmt.Fprintf(ctx.Writer, "event: %s\n", event.Event)
			if err != nil {
				slog.Error("failed writing sse event", "err", err.Error(), "chanId", channel.ID, "userId", user.ID)
				return
			}
			_, err = fmt.Fprintf(ctx.Writer, "data: %s\n\n", string(dataBytes))
			if err != nil {
				slog.Error("failed writing sse data", "err", err.Error(), "chanId", channel.ID, "userId", user.ID)
				return
			}
			if err = rc.Flush(); err != nil {
				slog.Error("failed flusing sse writer", "err", err.Error(), "chanId", channel.ID, "userId", user.ID)
				return
			}
		}
	}
}

func (t *api) channelsPlay(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	channel, err := t.db.GetChannelByID(uint(id))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if channel.CreatorID != user.ID && !channelHasMember(channel, user.ID) {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	sound, err := t.getSoundByIDOrHandle(ctx.Param("soundId"))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "sound not found"})
		return
	}
	if err != nil {
		slog.Error("failed getting sound from database", "id", ctx.Param("soundId"), "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	t.sseManager.Broadcast(channel.ID, sse.Event{
		Event: sse.EventTypePlay,
		Data:  sse.EventDataPlay{Sound: sound.ID},
	})

	ctx.Status(http.StatusNoContent)
}

func channelHasMember(channel *database.Channel, userID uint) bool {
	for _, m := range channel.Members {
		if m.ID == userID {
			return true
		}
	}
	return false
}
