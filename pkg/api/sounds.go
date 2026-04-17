package api

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/zekrotja/yuri/pkg/database"
	"github.com/zekrotja/yuri/pkg/ffmpeg"
)

var filterMap = map[string]ffmpeg.Filter{
	"normalize": ffmpeg.FilterNormalize,
	"overdrive": ffmpeg.FilterOverdrive,
}

func (t *api) soundsUpload(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	handle := ctx.PostForm("handle")
	if handle == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "handle is required"})
		return
	}

	tags := ctx.PostForm("tags")

	publicStr := ctx.PostForm("public")
	public := publicStr == "true" || publicStr == "1"

	sound, err := t.db.GetSoundByHandle(handle, user.ID)
	if err == nil {
		ctx.JSON(http.StatusConflict, gin.H{"error": "handle already in use"})
		return
	}
	if err != nil && err != database.ErrNotFound {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	var filters []ffmpeg.Filter
	for _, name := range ctx.PostFormArray("filters") {
		f, ok := filterMap[name]
		if !ok {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("unknown filter: %s", name)})
			return
		}
		filters = append(filters, f)
	}

	file, _, err := ctx.Request.FormFile("file")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	defer file.Close()

	randBytes := make([]byte, 8)
	if _, err = rand.Read(randBytes); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	storageID := strings.ToLower(handle) + "-" + hex.EncodeToString(randBytes)

	var encoded bytes.Buffer
	if err = t.encoder.Format(file, &encoded, filters...); err != nil {
		ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": "failed to encode file: " + err.Error()})
		return
	}

	if err = t.storage.Store(storageID, &encoded); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store file"})
		return
	}

	sound, err = t.db.CreateSound(handle, storageID, tags, public, user.ID)
	if err != nil {
		_ = t.storage.Delete(storageID)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create sound"})
		return
	}

	ctx.JSON(http.StatusCreated, sound)
}
