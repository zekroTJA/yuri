package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/zekrotja/yuri/pkg/database"
)

type channelRequest struct {
	Name string `json:"name" binding:"required"`
}

func (t *api) channelsCreate(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	var req channelRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	channel, err := t.db.CreateChannel(req.Name, user.ID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create channel"})
		return
	}

	ctx.JSON(http.StatusCreated, channel)
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
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if channel.OwnerID != user.ID && !channelHasMember(channel, user.ID) {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	ctx.JSON(http.StatusOK, channel)
}

func (t *api) channelsUpdate(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req channelRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	channel, err := t.db.GetChannelByID(uint(id))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if channel.OwnerID != user.ID {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	channel, err = t.db.UpdateChannel(uint(id), req.Name)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update channel"})
		return
	}

	ctx.JSON(http.StatusOK, channel)
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
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if channel.OwnerID != user.ID {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	if err = t.db.DeleteChannel(uint(id)); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete channel"})
		return
	}

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
