package api

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/zekrotja/yuri/pkg/api/models"
	"github.com/zekrotja/yuri/pkg/api/sse"
	"github.com/zekrotja/yuri/pkg/database"
	"github.com/zekrotja/yuri/pkg/util"
)

func (t *api) channelsCreate(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	var req models.ChannelRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidRequestBody)
		return
	}

	channel, err := t.db.CreateChannel(req.Name, user.ID)
	if err != nil {
		slog.Error("failed creating channel in database", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	channel, err = t.db.GetChannelByID(channel.ID)
	if err != nil {
		slog.Error("failed getting channel from database", "id", channel.ID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	ctx.JSON(http.StatusCreated, models.ChannelToResponse(channel, user.ID, nil))
}

func (t *api) channelsList(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	channels, err := t.db.ListChannelsByUser(user.ID)
	if err != nil {
		slog.Error("failed listing channels from database", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	t.connectionsMtx.RLock()
	defer t.connectionsMtx.RUnlock()

	resp := make([]*models.ChannelResponse, len(channels))
	for i, c := range channels {
		resp[i] = models.ChannelToResponse(c, user.ID, t.connections[c.ID].Collect())
	}

	ctx.JSON(http.StatusOK, resp)
}

func (t *api) channelsGet(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidID)
		return
	}

	channel, err := t.db.GetChannelByID(uint(id))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrChannelNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	if channel.CreatorID != user.ID && !channelHasMember(channel, user.ID) {
		ctx.JSON(http.StatusForbidden, ErrForbidden)
		return
	}

	t.connectionsMtx.RLock()
	defer t.connectionsMtx.RUnlock()
	channelConnections := t.connections[channel.ID].Collect()

	ctx.JSON(http.StatusOK, models.ChannelToResponse(channel, user.ID, channelConnections))
}

func (t *api) channelsUpdate(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidID)
		return
	}

	var req models.ChannelRequest
	if err = ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidRequestBody)
		return
	}

	channel, err := t.db.GetChannelByID(uint(id))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrChannelNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	if channel.CreatorID != user.ID {
		ctx.JSON(http.StatusForbidden, ErrForbidden)
		return
	}

	channel, err = t.db.UpdateChannel(uint(id), req.Name)
	if err != nil {
		slog.Error("failed updating channel in database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	channel, err = t.db.GetChannelByID(uint(id))
	if err != nil {
		slog.Error("failed getting channel from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	t.connectionsMtx.RLock()
	defer t.connectionsMtx.RUnlock()
	connectedUserIds := t.connections[channel.ID].Collect()

	channelResponse := models.ChannelToResponse(channel, user.ID, connectedUserIds)

	t.sseManager.Send(sse.Event{
		Event: sse.EventTypeChannelUpdate,
		Data: sse.EventDataChannelUpdate{
			Channel: channelResponse,
		},
	}, channel.AssociatedUserIds())

	ctx.JSON(http.StatusOK, channelResponse)
}

func (t *api) channelsDelete(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidID)
		return
	}

	channel, err := t.db.GetChannelByID(uint(id))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrChannelNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	if channel.CreatorID != user.ID {
		ctx.JSON(http.StatusForbidden, ErrForbidden)
		return
	}

	if err = t.db.DeleteChannel(uint(id)); err != nil {
		slog.Error("failed deleting channel from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	t.connectionsMtx.Lock()
	defer t.connectionsMtx.Unlock()

	delete(t.connections, channel.ID)

	t.sseManager.Send(sse.Event{
		Event: sse.EventTypeChannelDelete,
		Data: sse.EventDataChannelDelete{
			ChannelId: channel.ID,
		},
	}, channel.AssociatedUserIds())

	ctx.Status(http.StatusNoContent)
}

func (t *api) channelsConnect(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidID)
		return
	}

	channel, err := t.db.GetChannelByID(uint(id))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrChannelNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	if channel.CreatorID != user.ID && !channelHasMember(channel, user.ID) {
		ctx.JSON(http.StatusForbidden, ErrForbidden)
		return
	}

	t.connectionsMtx.Lock()
	defer t.connectionsMtx.Unlock()

	var disconnectedId uint
	for chanId, conns := range t.connections {
		if chanId != channel.ID && conns.Exists(user.ID) {
			prevChan, err := t.db.GetChannelByID(chanId)
			if err != nil {
				slog.Error("failed getting channel from database", "id", id, "err", err)
				ctx.JSON(http.StatusInternalServerError, ErrInternal)
				return
			}
			_ = conns.Remove(user.ID)
			channelConnections := conns.Collect()
			t.sseManager.Send(sse.Event{
				Event: sse.EventTypeChannelUpdate,
				Data: sse.EventDataChannelUpdate{
					Channel: models.ChannelToResponse(prevChan, user.ID, channelConnections),
				},
			}, channelConnections)
			disconnectedId = chanId
			break
		}
	}

	chanConnections, ok := t.connections[channel.ID]
	if !ok {
		chanConnections = util.NewSet[uint]()
		t.connections[channel.ID] = chanConnections
	}

	ok = chanConnections.Insert(user.ID)
	if !ok {
		ctx.JSON(http.StatusBadRequest, ErrAlreadyConnected)
		return
	}

	channelResponse := models.ChannelToResponse(channel, user.ID, chanConnections.Collect())
	t.sseManager.Send(sse.Event{
		Event: sse.EventTypeChannelUpdate,
		Data: sse.EventDataChannelUpdate{
			Channel: channelResponse,
		},
	}, channel.AssociatedUserIds())

	ctx.JSON(http.StatusOK, models.ChannelConnectionResponse{
		ChannelResponse:       channelResponse,
		DisconnectedChannelId: disconnectedId,
	})
}

func (t *api) channelsDisconnect(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidID)
		return
	}

	channel, err := t.db.GetChannelByID(uint(id))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrChannelNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	if channel.CreatorID != user.ID && !channelHasMember(channel, user.ID) {
		ctx.JSON(http.StatusForbidden, ErrForbidden)
		return
	}

	t.connectionsMtx.Lock()
	defer t.connectionsMtx.Unlock()

	t.connections[channel.ID].Remove(user.ID)

	channelResponse := models.ChannelToResponse(channel, user.ID, t.connections[channel.ID].Collect())
	t.sseManager.Send(sse.Event{
		Event: sse.EventTypeChannelUpdate,
		Data: sse.EventDataChannelUpdate{
			Channel: channelResponse,
		},
	}, channel.AssociatedUserIds())

	ctx.Status(http.StatusNoContent)
}

func (t *api) channelsPlay(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidID)
		return
	}

	channel, err := t.db.GetChannelByID(uint(id))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrChannelNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	if channel.CreatorID != user.ID && !channelHasMember(channel, user.ID) {
		ctx.JSON(http.StatusNotFound, ErrNotFound)
		return
	}

	sound, err := t.getSoundByIDOrHandle(ctx.Param("soundId"))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrSoundNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting sound from database", "id", ctx.Param("soundId"), "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	t.connectionsMtx.RLock()
	defer t.connectionsMtx.RUnlock()

	channelConnections := t.connections[channel.ID].Collect()

	t.sseManager.Send(sse.Event{
		Event: sse.EventTypePlay,
		Data:  sse.EventDataPlay{Sound: sound.ID},
	}, channelConnections)

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
