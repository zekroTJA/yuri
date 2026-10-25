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

// channelsCreate godoc
//
//	@Summary		Create channel
//	@Description	Creates a new channel owned by the authenticated user. Requires the "write" scope when using an API key.
//	@Tags			Channels
//	@Accept			json
//	@Produce		json
//	@Security		ApiKeyAuth
//	@Param			body	body		models.ChannelRequest	true	"Channel"
//	@Success		201		{object}	models.ChannelResponse
//	@Failure		400		{object}	api.ErrorResponse
//	@Failure		401		{object}	api.ErrorResponse
//	@Failure		500		{object}	api.ErrorResponse
//	@Router			/channels [post]
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

// channelsList godoc
//
//	@Summary		List channels
//	@Description	Lists all channels the authenticated user owns or is a member of. Requires the "read" scope when using an API key.
//	@Tags			Channels
//	@Produce		json
//	@Security		ApiKeyAuth
//	@Success		200	{array}		models.ChannelResponse
//	@Failure		401	{object}	api.ErrorResponse
//	@Failure		500	{object}	api.ErrorResponse
//	@Router			/channels [get]
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

// channelsGet godoc
//
//	@Summary		Get channel
//	@Description	Returns a channel the authenticated user owns or is a member of. Requires the "read" scope when using an API key.
//	@Tags			Channels
//	@Produce		json
//	@Security		ApiKeyAuth
//	@Param			id	path		int	true	"Channel ID"
//	@Success		200	{object}	models.ChannelResponse
//	@Failure		400	{object}	api.ErrorResponse
//	@Failure		401	{object}	api.ErrorResponse
//	@Failure		403	{object}	api.ErrorResponse
//	@Failure		404	{object}	api.ErrorResponse
//	@Failure		500	{object}	api.ErrorResponse
//	@Router			/channels/{id} [get]
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

// channelsUpdate godoc
//
//	@Summary		Update channel
//	@Description	Updates the name of a channel. Only allowed for the channel owner. Requires the "write" scope when using an API key.
//	@Tags			Channels
//	@Accept			json
//	@Produce		json
//	@Security		ApiKeyAuth
//	@Param			id		path		int						true	"Channel ID"
//	@Param			body	body		models.ChannelRequest	true	"Channel"
//	@Success		200		{object}	models.ChannelResponse
//	@Failure		400		{object}	api.ErrorResponse
//	@Failure		401		{object}	api.ErrorResponse
//	@Failure		403		{object}	api.ErrorResponse
//	@Failure		404		{object}	api.ErrorResponse
//	@Failure		500		{object}	api.ErrorResponse
//	@Router			/channels/{id} [post]
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

// channelsDelete godoc
//
//	@Summary		Delete channel
//	@Description	Deletes a channel. Only allowed for the channel owner. Requires the "delete" scope when using an API key.
//	@Tags			Channels
//	@Produce		json
//	@Security		ApiKeyAuth
//	@Param			id	path	int	true	"Channel ID"
//	@Success		204
//	@Failure		400	{object}	api.ErrorResponse
//	@Failure		401	{object}	api.ErrorResponse
//	@Failure		403	{object}	api.ErrorResponse
//	@Failure		404	{object}	api.ErrorResponse
//	@Failure		500	{object}	api.ErrorResponse
//	@Router			/channels/{id} [delete]
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

// channelsLeave godoc
//
//	@Summary		Leave channel
//	@Description	Removes the authenticated user from the members of a channel they have joined. If the user is connected to the channel, they are disconnected from it. Not allowed for the channel owner. Requires the "write" scope when using an API key.
//	@Tags			Channels
//	@Produce		json
//	@Security		ApiKeyAuth
//	@Param			id	path	int	true	"Channel ID"
//	@Success		204
//	@Failure		400	{object}	api.ErrorResponse
//	@Failure		401	{object}	api.ErrorResponse
//	@Failure		403	{object}	api.ErrorResponse
//	@Failure		404	{object}	api.ErrorResponse
//	@Failure		500	{object}	api.ErrorResponse
//	@Router			/channels/{id}/leave [post]
func (t *api) channelsLeave(ctx *gin.Context) {
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

	if channel.CreatorID == user.ID {
		ctx.JSON(http.StatusBadRequest, ErrOwnerCannotLeave)
		return
	}

	if !channelHasMember(channel, user.ID) {
		ctx.JSON(http.StatusForbidden, ErrForbidden)
		return
	}

	if err = t.db.RemoveChannelMember(channel.ID, user.ID); err != nil {
		slog.Error("failed removing channel member from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	channel, err = t.db.GetChannelByID(channel.ID)
	if err != nil {
		slog.Error("failed getting channel from database", "id", id, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	t.connectionsMtx.Lock()
	defer t.connectionsMtx.Unlock()

	t.connections[channel.ID].Remove(user.ID)

	t.sseManager.Send(sse.Event{
		Event: sse.EventTypeChannelUpdate,
		Data: sse.EventDataChannelUpdate{
			Channel: models.ChannelToResponse(channel, user.ID, t.connections[channel.ID].Collect()),
		},
	}, channel.AssociatedUserIds())

	// For the leaving user, the channel is gone just like it has been deleted.
	t.sseManager.Send(sse.Event{
		Event: sse.EventTypeChannelDelete,
		Data: sse.EventDataChannelDelete{
			ChannelId: channel.ID,
		},
	}, []uint{user.ID})

	ctx.Status(http.StatusNoContent)
}

// channelsConnect godoc
//
//	@Summary		Connect to channel
//	@Description	Connects the authenticated user to a channel. If the user is connected to another channel, they are disconnected from it first. Requires the "write" scope when using an API key.
//	@Tags			Channels
//	@Produce		json
//	@Security		ApiKeyAuth
//	@Param			id	path		int	true	"Channel ID"
//	@Success		200	{object}	models.ChannelConnectionResponse
//	@Failure		400	{object}	api.ErrorResponse
//	@Failure		401	{object}	api.ErrorResponse
//	@Failure		403	{object}	api.ErrorResponse
//	@Failure		404	{object}	api.ErrorResponse
//	@Failure		500	{object}	api.ErrorResponse
//	@Router			/channels/{id}/connect [post]
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

// channelsDisconnect godoc
//
//	@Summary		Disconnect from channel
//	@Description	Disconnects the authenticated user from the channel they are currently connected to. Requires the "write" scope when using an API key.
//	@Tags			Channels
//	@Produce		json
//	@Security		ApiKeyAuth
//	@Success		204
//	@Failure		400	{object}	api.ErrorResponse
//	@Failure		401	{object}	api.ErrorResponse
//	@Failure		404	{object}	api.ErrorResponse
//	@Failure		500	{object}	api.ErrorResponse
//	@Router			/channels/disconnect [post]
func (t *api) channelsDisconnect(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	t.connectionsMtx.Lock()
	defer t.connectionsMtx.Unlock()

	chanId, ok := t.findUserInChannel(user.ID)
	if !ok {
		ctx.JSON(http.StatusBadRequest, ErrNotConnected)
		return
	}

	channel, err := t.db.GetChannelByID(chanId)
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrChannelNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", chanId, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

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
