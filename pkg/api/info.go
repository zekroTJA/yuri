package api

import (
	"net/http"
	"runtime"

	"github.com/gin-gonic/gin"
	"github.com/zekrotja/yuri/pkg/api/models"
	"github.com/zekrotja/yuri/pkg/static"
)

func (t *api) info(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, models.InfoResponse{
		Version:   static.Version,
		BuildDate: static.BuildDate,
		GoVersion: runtime.Version(),
	})
}
