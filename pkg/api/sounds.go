package api

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zekrotja/yuri/pkg/api/models"
	"github.com/zekrotja/yuri/pkg/api/sse"
	"github.com/zekrotja/yuri/pkg/database"
	"github.com/zekrotja/yuri/pkg/ffmpeg"
	"github.com/zekrotja/yuri/pkg/ytdlp"
)

const downloadTimeout = 5 * time.Minute

func (t *api) soundsUpload(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	handle := ctx.PostForm("handle")
	if handle == "" {
		ctx.JSON(http.StatusBadRequest, ErrHandleRequired)
		return
	}
	if !isValidSoundHandle(handle) {
		ctx.JSON(http.StatusBadRequest, ErrInvalidHandle)
		return
	}

	sound, err := t.db.GetSoundByHandle(handle)
	if err == nil {
		ctx.JSON(http.StatusConflict, ErrHandleConflict)
		return
	}
	if err != nil && err != database.ErrNotFound {
		slog.Error("failed checking sound handle availability", "handle", handle, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	var filters []ffmpeg.Filter
	for _, name := range ctx.PostFormArray("filters") {
		f, ok := filterMap[name]
		if !ok {
			ctx.JSON(http.StatusBadRequest, ErrInvalidFilter)
			return
		}
		filters = append(filters, f)
	}

	var source io.Reader
	file, _, err := ctx.Request.FormFile("file")
	hasFile := err == nil
	if hasFile {
		defer file.Close()
		source = file
	}

	mediaURL := strings.TrimSpace(ctx.PostForm("url"))
	switch {
	case hasFile && mediaURL != "":
		ctx.JSON(http.StatusBadRequest, ErrFileAndURL)
		return
	case !hasFile && mediaURL == "":
		ctx.JSON(http.StatusBadRequest, ErrFileRequired)
		return
	case mediaURL != "":
		if !isValidMediaURL(mediaURL) {
			ctx.JSON(http.StatusBadRequest, ErrInvalidURL)
			return
		}

		downloadCtx, cancel := context.WithTimeout(ctx.Request.Context(), downloadTimeout)
		defer cancel()

		var downloaded bytes.Buffer
		err = t.downloader.Download(downloadCtx, mediaURL, &downloaded)
		if errors.Is(err, ytdlp.ErrNotInstalled) {
			ctx.JSON(http.StatusNotImplemented, ErrYtdlpNotInstalled)
			return
		}
		if err != nil {
			slog.Error("failed downloading media", "url", mediaURL, "err", err)
			ctx.JSON(http.StatusUnprocessableEntity, ErrDownloadFailed)
			return
		}
		source = &downloaded
	}

	tags := ctx.PostFormArray("tags")

	storageID, err := newStorageID(handle)
	if err != nil {
		slog.Error("failed generating storage ID", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	var encoded bytes.Buffer
	if err = t.encoder.Format(source, &encoded, filters...); err != nil {
		slog.Error("failed encoding sound file", "handle", handle, "err", err)
		ctx.JSON(http.StatusUnprocessableEntity, ErrSoundEncodeFailed)
		return
	}

	if err = t.storage.Store(storageID, &encoded); err != nil {
		slog.Error("failed storing sound file", "storage_id", storageID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	sound, err = t.db.CreateSound(handle, storageID, tags, user.ID)
	if err != nil {
		_ = t.storage.Delete(storageID)
		slog.Error("failed creating sound in database", "handle", handle, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	soundResponse := models.SoundToResponse(sound)
	t.sseManager.Broadcast(sse.Event{
		Event: sse.EventTypeSoundCreate,
		Data:  sse.EventDataSoundCreate{Sound: soundResponse},
	})

	ctx.JSON(http.StatusCreated, soundResponse)
}

func (t *api) soundsList(ctx *gin.Context) {
	sounds, err := t.db.ListSounds()
	if err != nil {
		slog.Error("failed listing sounds from database", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	resp := make([]*models.SoundResponse, len(sounds))
	for i, s := range sounds {
		resp[i] = models.SoundToResponse(s)
	}

	ctx.JSON(http.StatusOK, resp)
}

func (t *api) soundsGet(ctx *gin.Context) {
	sound, err := t.getSoundByIDOrHandle(ctx.Param("id"))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrSoundNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting sound from database", "id", ctx.Param("id"), "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	file, err := t.storage.Load(sound.StorageId)
	if err != nil {
		slog.Error("failed loading sound file", "storage_id", sound.StorageId, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}
	defer file.Close()

	ctx.Header("Content-Type", "audio/ogg")
	ctx.Header("Content-Disposition", fmt.Sprintf(`inline; filename="%s.ogg"`, sound.Handle))
	if _, err = io.Copy(ctx.Writer, file); err != nil {
		slog.Error("failed streaming sound file", "storage_id", sound.StorageId, "err", err)
	}
}

func (t *api) soundsUpdate(ctx *gin.Context) {
	sound, err := t.getSoundByIDOrHandle(ctx.Param("id"))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrSoundNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting sound from database", "id", ctx.Param("id"), "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	var req models.SoundUpdateRequest
	if err = ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidRequestBody)
		return
	}

	if !isValidSoundHandle(req.Handle) {
		ctx.JSON(http.StatusBadRequest, ErrInvalidHandle)
		return
	}

	if req.Handle != sound.Handle {
		_, err = t.db.GetSoundByHandle(req.Handle)
		if err == nil {
			ctx.JSON(http.StatusConflict, ErrHandleConflict)
			return
		}
		if err != database.ErrNotFound {
			slog.Error("failed checking sound handle availability", "handle", req.Handle, "err", err)
			ctx.JSON(http.StatusInternalServerError, ErrInternal)
			return
		}
	}

	soundID := sound.ID
	if _, err = t.db.UpdateSound(soundID, req.Handle, req.Tags); err != nil {
		slog.Error("failed updating sound in database", "id", soundID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	sound, err = t.db.GetSoundByID(soundID)
	if err != nil {
		slog.Error("failed getting sound from database", "id", soundID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	soundResponse := models.SoundToResponse(sound)
	t.sseManager.Broadcast(sse.Event{
		Event: sse.EventTypeSoundUpdate,
		Data:  sse.EventDataSoundUpdate{Sound: soundResponse},
	})

	ctx.JSON(http.StatusOK, soundResponse)
}

func (t *api) soundsDelete(ctx *gin.Context) {
	sound, err := t.getSoundByIDOrHandle(ctx.Param("id"))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrSoundNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting sound from database", "id", ctx.Param("id"), "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	storageID := sound.StorageId

	if err = t.db.DeleteSound(sound.ID); err != nil {
		slog.Error("failed deleting sound from database", "id", sound.ID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	_ = t.storage.Delete(storageID)

	t.sseManager.Broadcast(sse.Event{
		Event: sse.EventTypeSoundDelete,
		Data:  sse.EventDataSoundDelete{SoundId: sound.ID},
	})

	ctx.Status(http.StatusNoContent)
}

func (t *api) soundsPlay(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	t.connectionsMtx.RLock()
	defer t.connectionsMtx.RUnlock()

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

	sound, err := t.getSoundByIDOrHandle(ctx.Param("id"))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrSoundNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting sound from database", "id", ctx.Param("soundId"), "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	channelConnections := t.connections[channel.ID].Collect()

	t.sseManager.Send(sse.Event{
		Event: sse.EventTypePlay,
		Data:  sse.EventDataPlay{Sound: sound.ID},
	}, channelConnections)

	ctx.Status(http.StatusNoContent)
}

func (t *api) soundsTrim(ctx *gin.Context) {
	sound, err := t.getSoundByIDOrHandle(ctx.Param("id"))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrSoundNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting sound from database", "id", ctx.Param("id"), "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	var req models.SoundTrimRequest
	if err = ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidRequestBody)
		return
	}

	if req.Start < 0 || req.End <= req.Start {
		ctx.JSON(http.StatusBadRequest, ErrInvalidTrimRange)
		return
	}

	file, err := t.storage.Load(sound.StorageId)
	if err != nil {
		slog.Error("failed loading sound file", "storage_id", sound.StorageId, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}
	defer file.Close()

	start := time.Duration(req.Start * float64(time.Second))
	end := time.Duration(req.End * float64(time.Second))

	var trimmed bytes.Buffer
	if err = t.encoder.Trim(file, &trimmed, start, end); err != nil {
		slog.Error("failed trimming sound file", "storage_id", sound.StorageId, "err", err)
		ctx.JSON(http.StatusUnprocessableEntity, ErrSoundTrimFailed)
		return
	}

	if trimmed.Len() == 0 {
		ctx.JSON(http.StatusBadRequest, ErrInvalidTrimRange)
		return
	}

	// The trimmed sound is stored under a new storage ID so that the
	// original file stays intact until the database points to the new one.
	storageID, err := newStorageID(sound.Handle)
	if err != nil {
		slog.Error("failed generating storage ID", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	if err = t.storage.Store(storageID, &trimmed); err != nil {
		slog.Error("failed storing sound file", "storage_id", storageID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	soundID := sound.ID
	oldStorageID := sound.StorageId
	if err = t.db.UpdateSoundStorageID(soundID, storageID); err != nil {
		_ = t.storage.Delete(storageID)
		slog.Error("failed updating sound storage ID in database", "id", soundID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	_ = t.storage.Delete(oldStorageID)

	sound, err = t.db.GetSoundByID(soundID)
	if err != nil {
		slog.Error("failed getting sound from database", "id", soundID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	soundResponse := models.SoundToResponse(sound)
	t.sseManager.Broadcast(sse.Event{
		Event: sse.EventTypeSoundUpdate,
		Data:  sse.EventDataSoundUpdate{Sound: soundResponse},
	})

	ctx.JSON(http.StatusOK, soundResponse)
}

func (t *api) soundsCopy(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	sound, err := t.getSoundByIDOrHandle(ctx.Param("id"))
	if err == database.ErrNotFound {
		ctx.JSON(http.StatusNotFound, ErrSoundNotFound)
		return
	}
	if err != nil {
		slog.Error("failed getting sound from database", "id", ctx.Param("id"), "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	var req models.SoundCopyRequest
	if err = ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, ErrInvalidRequestBody)
		return
	}

	if !isValidSoundHandle(req.Handle) {
		ctx.JSON(http.StatusBadRequest, ErrInvalidHandle)
		return
	}

	_, err = t.db.GetSoundByHandle(req.Handle)
	if err == nil {
		ctx.JSON(http.StatusConflict, ErrHandleConflict)
		return
	}
	if err != database.ErrNotFound {
		slog.Error("failed checking sound handle availability", "handle", req.Handle, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	file, err := t.storage.Load(sound.StorageId)
	if err != nil {
		slog.Error("failed loading sound file", "storage_id", sound.StorageId, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}
	defer file.Close()

	storageID, err := newStorageID(req.Handle)
	if err != nil {
		slog.Error("failed generating storage ID", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	// The stored file is already encoded, so it is copied as-is.
	if err = t.storage.Store(storageID, file); err != nil {
		_ = t.storage.Delete(storageID)
		slog.Error("failed storing sound file", "storage_id", storageID, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	created, err := t.db.CreateSound(req.Handle, storageID, req.Tags, user.ID)
	if err != nil {
		_ = t.storage.Delete(storageID)
		slog.Error("failed creating sound in database", "handle", req.Handle, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	created, err = t.db.GetSoundByID(created.ID)
	if err != nil {
		slog.Error("failed getting sound from database", "handle", req.Handle, "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	soundResponse := models.SoundToResponse(created)
	t.sseManager.Broadcast(sse.Event{
		Event: sse.EventTypeSoundCreate,
		Data:  sse.EventDataSoundCreate{Sound: soundResponse},
	})

	ctx.JSON(http.StatusCreated, soundResponse)
}
