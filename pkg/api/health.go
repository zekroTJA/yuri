package api

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zekrotja/yuri/pkg/api/models"
)

const healthCheckTimeout = 5 * time.Second

// health godoc
//
//	@Summary		Health check
//	@Description	Checks whether the service is healthy by verifying the database connection.
//	@Tags			Health
//	@Produce		json
//	@Success		200	{object}	models.HealthResponse
//	@Failure		503	{object}	api.ErrorResponse
//	@Router			/health [get]
func (t *api) health(ctx *gin.Context) {
	pingCtx, cancel := context.WithTimeout(ctx.Request.Context(), healthCheckTimeout)
	defer cancel()

	if err := t.db.Ping(pingCtx); err != nil {
		slog.Error("health check failed pinging database", "err", err)
		ctx.JSON(http.StatusServiceUnavailable, ErrUnhealthy)
		return
	}

	ctx.JSON(http.StatusOK, models.HealthResponse{
		Status: "ok",
	})
}
