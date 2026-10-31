package api

import (
	"net/http"
	"runtime"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/zekrotja/yuri/pkg/api/models"
	"github.com/zekrotja/yuri/pkg/static"
)

// info godoc
//
//	@Summary		Get service info
//	@Description	Returns build information about the running service, such as its version, build date and the Go version it was built with. Requires the "read" scope when using an API key.
//	@Tags			Info
//	@Produce		json
//	@Security		ApiKeyAuth
//	@Success		200	{object}	models.InfoResponse
//	@Failure		401	{object}	api.ErrorResponse
//	@Router			/info [get]
func (t *api) info(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, models.InfoResponse{
		Version:   strings.TrimSpace(static.Version),
		BuildDate: strings.TrimSpace(static.BuildDate),
		GoVersion: runtime.Version(),
	})
}
