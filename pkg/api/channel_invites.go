package api

import (
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zekrotja/yuri/pkg/api/models"
	"github.com/zekrotja/yuri/pkg/api/sse"
	"github.com/zekrotja/yuri/pkg/database"
	"github.com/zekrotja/yuri/pkg/util"
)

const (
	channelInviteCodeLen = 16
)

func (t *api) channelInvitesCreate(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	channelID, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.ChannelInviteCreateRequest
	if err = ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.ExpiresAt != nil && req.ExpiresAt.Before(time.Now()) {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "expires_at must be in the future"})
		return
	}

	channel, err := t.db.GetChannelByID(uint(channelID))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", channelID, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if channel.CreatorID != user.ID {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	code := util.GenerateRandomString(channelInviteCodeLen, util.DefaultCharset)

	invite, err := t.db.CreateChannelInvite(code, channel.ID, user.ID, req.MaxActivations, req.ExpiresAt)
	if err != nil {
		slog.Error("failed creating channel invite in database", "channel_id", channel.ID, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create channel invite"})
		return
	}

	ctx.JSON(http.StatusCreated, models.ChannelInviteToResponse(invite))
}

func (t *api) channelInvitesList(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	channelID, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	channel, err := t.db.GetChannelByID(uint(channelID))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", channelID, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if channel.CreatorID != user.ID {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	invites, err := t.db.ListChannelInvitesByChannel(channel.ID)
	if err != nil {
		slog.Error("failed listing channel invites from database", "channel_id", channel.ID, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	resp := make([]*models.ChannelInviteResponse, len(invites))
	for i, inv := range invites {
		resp[i] = models.ChannelInviteToResponse(inv)
	}

	ctx.JSON(http.StatusOK, resp)
}

func (t *api) channelInvitesDelete(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	channelID, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	inviteID, err := strconv.ParseUint(ctx.Param("inviteId"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid invite id"})
		return
	}

	channel, err := t.db.GetChannelByID(uint(channelID))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", channelID, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if channel.CreatorID != user.ID {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	invite, err := t.db.GetChannelInviteByID(uint(inviteID))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "invite not found"})
		return
	}
	if err != nil {
		slog.Error("failed getting channel invite from database", "id", inviteID, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if invite.ChannelID != channel.ID {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "invite not found"})
		return
	}

	if err = t.db.DeleteChannelInvite(invite.ID); err != nil {
		slog.Error("failed deleting channel invite from database", "id", invite.ID, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete channel invite"})
		return
	}

	ctx.Status(http.StatusNoContent)
}

func (t *api) channelInvitesRedeem(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	code := ctx.Param("code")
	if code == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid code"})
		return
	}

	channel, err := t.db.RedeemChannelInvite(code, user.ID)
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "invite not found"})
		return
	}
	if err == database.ErrInviteExpired {
		ctx.JSON(http.StatusGone, gin.H{"error": "invite expired"})
		return
	}
	if err == database.ErrInviteExhausted {
		ctx.JSON(http.StatusGone, gin.H{"error": "invite has no remaining activations"})
		return
	}
	if err != nil {
		slog.Error("failed redeeming channel invite", "code", code, "err", err)
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
