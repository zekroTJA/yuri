package api

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zekrotja/yuri/pkg/database"
	"github.com/zekrotja/yuri/pkg/ffmpeg"
)

type soundUserResponse struct {
	ID     uint   `json:"id"`
	Handle string `json:"handle"`
}

type soundResponse struct {
	ID        uint              `json:"id"`
	CreatedAt time.Time         `json:"created_at"`
	UpdatedAt time.Time         `json:"updated_at"`
	Handle    string            `json:"handle"`
	Tags      []string          `json:"tags"`
	Creator   soundUserResponse `json:"creator"`
}

type soundUpdateRequest struct {
	Handle string   `json:"handle" binding:"required"`
	Tags   []string `json:"tags"`
}

func soundToResponse(s *database.Sound) soundResponse {
	creator := soundUserResponse{}
	if s.Owner != nil {
		creator = soundUserResponse{ID: s.Owner.ID, Handle: s.Owner.Handle}
	}
	return soundResponse{
		ID:        s.ID,
		CreatedAt: s.CreatedAt,
		UpdatedAt: s.UpdatedAt,
		Handle:    s.Handle,
		Tags:      s.Tags,
		Creator:   creator,
	}
}

func (t *api) getSoundByIDOrHandle(idOrHandle string) (*database.Sound, error) {
	if id, err := strconv.ParseUint(idOrHandle, 10, 64); err == nil {
		return t.db.GetSoundByID(uint(id))
	}
	return t.db.GetSoundByHandle(idOrHandle)
}

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

	sound, err := t.db.GetSoundByHandle(handle)
	if err == nil {
		ctx.JSON(http.StatusConflict, gin.H{"error": "handle already in use"})
		return
	}
	if err != nil && err != database.ErrNotFound {
		slog.Error("failed checking sound handle availability", "handle", handle, "err", err)
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

	tags := ctx.PostFormArray("tags")

	randBytes := make([]byte, 8)
	if _, err = rand.Read(randBytes); err != nil {
		slog.Error("failed generating random bytes", "err", err)
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
		slog.Error("failed storing sound file", "storage_id", storageID, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store file"})
		return
	}

	sound, err = t.db.CreateSound(handle, storageID, tags, user.ID)
	if err != nil {
		_ = t.storage.Delete(storageID)
		slog.Error("failed creating sound in database", "handle", handle, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create sound"})
		return
	}

	ctx.JSON(http.StatusCreated, sound)
}

func (t *api) soundsList(ctx *gin.Context) {
	sounds, err := t.db.ListSounds()
	if err != nil {
		slog.Error("failed listing sounds from database", "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	resp := make([]soundResponse, len(sounds))
	for i, s := range sounds {
		resp[i] = soundToResponse(s)
	}

	ctx.JSON(http.StatusOK, resp)
}

func (t *api) soundsUpdate(ctx *gin.Context) {
	sound, err := t.getSoundByIDOrHandle(ctx.Param("id"))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "sound not found"})
		return
	}
	if err != nil {
		slog.Error("failed getting sound from database", "id", ctx.Param("id"), "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	var req soundUpdateRequest
	if err = ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Handle != sound.Handle {
		_, err = t.db.GetSoundByHandle(req.Handle)
		if err == nil {
			ctx.JSON(http.StatusConflict, gin.H{"error": "handle already in use"})
			return
		}
		if err != database.ErrNotFound {
			slog.Error("failed checking sound handle availability", "handle", req.Handle, "err", err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			return
		}
	}

	soundID := sound.ID
	if _, err = t.db.UpdateSound(soundID, req.Handle, req.Tags); err != nil {
		slog.Error("failed updating sound in database", "id", soundID, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update sound"})
		return
	}

	sound, err = t.db.GetSoundByID(soundID)
	if err != nil {
		slog.Error("failed getting sound from database", "id", soundID, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	ctx.JSON(http.StatusOK, soundToResponse(sound))
}

func (t *api) soundsDelete(ctx *gin.Context) {
	sound, err := t.getSoundByIDOrHandle(ctx.Param("id"))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "sound not found"})
		return
	}
	if err != nil {
		slog.Error("failed getting sound from database", "id", ctx.Param("id"), "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	storageID := sound.StorageId

	if err = t.db.DeleteSound(sound.ID); err != nil {
		slog.Error("failed deleting sound from database", "id", sound.ID, "err", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete sound"})
		return
	}

	_ = t.storage.Delete(storageID)

	ctx.Status(http.StatusNoContent)
}
