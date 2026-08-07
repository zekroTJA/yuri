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
		ctx.JSON(http.StatusBadRequest, ErrInvalidID)
		return
	}

	var req models.ChannelInviteCreateRequest
	if err = ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidRequestBody)
		return
	}

	if req.ExpiresAt != nil && req.ExpiresAt.Before(time.Now()) {
		ctx.JSON(http.StatusBadRequest, ErrInvalidExpiresAt)
		return
	}

	channel, err := t.db.GetChannelByID(uint(channelID))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrChannelNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", channelID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	if channel.CreatorID != user.ID {
		ctx.JSON(http.StatusForbidden, ErrForbidden)
		return
	}

	code := util.GenerateRandomString(channelInviteCodeLen, util.DefaultCharset)

	invite, err := t.db.CreateChannelInvite(code, channel.ID, user.ID, req.MaxActivations, req.ExpiresAt)
	if err != nil {
		slog.Error("failed creating channel invite in database", "channel_id", channel.ID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	ctx.JSON(http.StatusCreated, models.ChannelInviteToResponse(invite))
}

func (t *api) channelInvitesList(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	channelID, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidID)
		return
	}

	channel, err := t.db.GetChannelByID(uint(channelID))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrChannelNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", channelID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	if channel.CreatorID != user.ID {
		ctx.JSON(http.StatusForbidden, ErrForbidden)
		return
	}

	invites, err := t.db.ListChannelInvitesByChannel(channel.ID)
	if err != nil {
		slog.Error("failed listing channel invites from database", "channel_id", channel.ID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
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
		ctx.JSON(http.StatusBadRequest, ErrInvalidID)
		return
	}

	inviteID, err := strconv.ParseUint(ctx.Param("inviteId"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidInviteID)
		return
	}

	channel, err := t.db.GetChannelByID(uint(channelID))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrChannelNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting channel from database", "id", channelID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	if channel.CreatorID != user.ID {
		ctx.JSON(http.StatusForbidden, ErrForbidden)
		return
	}

	invite, err := t.db.GetChannelInviteByID(uint(inviteID))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrInviteNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting channel invite from database", "id", inviteID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	if invite.ChannelID != channel.ID {
		ctx.JSON(http.StatusNotFound, ErrInviteNotFound)
		return
	}

	if err = t.db.DeleteChannelInvite(invite.ID); err != nil {
		slog.Error("failed deleting channel invite from database", "id", invite.ID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	ctx.Status(http.StatusNoContent)
}

func (t *api) channelInvitesRedeem(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	code := ctx.Param("code")
	if code == "" {
		ctx.JSON(http.StatusBadRequest, ErrInvalidCode)
		return
	}

	var channel *database.Channel
	err := t.db.Transaction(func(tx *database.Database) error {
		invite, err := tx.GetChannelInviteByCode(code)
		if err != nil {
			return err
		}

		if invite.ExpiresAt != nil && time.Now().After(*invite.ExpiresAt) {
			return database.ErrInviteExpired
		}

		c, err := tx.GetChannelByID(invite.ChannelID)
		if err != nil {
			return err
		}

		alreadyMember := c.CreatorID == user.ID
		if !alreadyMember {
			for _, m := range c.Members {
				if m.ID == user.ID {
					alreadyMember = true
					break
				}
			}
		}

		if !alreadyMember {
			if invite.MaxActivations > 0 && invite.Activations >= invite.MaxActivations {
				return database.ErrInviteExhausted
			}

			if err = tx.AddChannelMember(c.ID, user.ID); err != nil {
				return err
			}

			invite.Activations++
			if _, err = tx.UpdateChannelInvite(invite); err != nil {
				return err
			}
		}

		channel, err = tx.GetChannelByID(invite.ChannelID)
		return err
	})
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrInviteNotFound)
		return
	}
	if err == database.ErrInviteExpired {
		ctx.JSON(http.StatusGone, ErrInviteExpired)
		return
	}
	if err == database.ErrInviteExhausted {
		ctx.JSON(http.StatusGone, ErrInviteExhausted)
		return
	}
	if err != nil {
		slog.Error("failed redeeming channel invite", "code", code, "err", err)
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
	}, connectedUserIds)

	ctx.JSON(http.StatusOK, channelResponse)
}
