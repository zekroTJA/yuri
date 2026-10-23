package api

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
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
	"github.com/zekrotja/yuri/pkg/soundarchive"
)

const maxImportSoundSize = 50 << 20

// oggMagic is the capture pattern every Ogg page starts with.
var oggMagic = []byte("OggS")

func (t *api) soundsExport(ctx *gin.Context) {
	sounds, err := t.db.ListSounds()
	if err != nil {
		slog.Error("failed listing sounds from database", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	fileName := fmt.Sprintf("yuri-sounds-%s.tar.gz", time.Now().Format("2006-01-02"))
	ctx.Header("Content-Type", "application/gzip")
	ctx.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, fileName))

	archive, err := soundarchive.NewWriter(ctx.Writer)
	if err != nil {
		slog.Error("failed creating sound archive", "err", err)
		ctx.Status(http.StatusInternalServerError)
		return
	}

	// The response is streamed, so errors after this point can not be
	// reported to the client anymore. Sounds which can not be exported are
	// skipped and the meta data is written last so that it only lists the
	// sounds actually contained in the archive.
	metas := make([]soundarchive.Meta, 0, len(sounds))
	for _, sound := range sounds {
		if !isValidSoundHandle(sound.Handle) {
			slog.Warn("skipping export of sound with invalid handle", "id", sound.ID, "handle", sound.Handle)
			continue
		}

		content, err := t.loadSoundFile(sound.StorageId)
		if err != nil {
			slog.Error("failed loading sound file for export", "storage_id", sound.StorageId, "err", err)
			continue
		}

		if err = archive.WriteSound(sound.Handle, content); err != nil {
			slog.Error("failed writing sound to archive", "id", sound.ID, "err", err)
			ctx.Abort()
			return
		}

		meta := soundarchive.Meta{
			Name:      sound.Handle,
			Tags:      sound.Tags,
			CreatedAt: sound.CreatedAt,
		}
		if meta.Tags == nil {
			meta.Tags = []string{}
		}
		if sound.Owner != nil {
			meta.Creator = sound.Owner.Handle
		}
		metas = append(metas, meta)
	}

	if err = archive.WriteMeta(metas); err != nil {
		slog.Error("failed writing meta to archive", "err", err)
		ctx.Abort()
		return
	}

	if err = archive.Close(); err != nil {
		slog.Error("failed closing sound archive", "err", err)
		ctx.Abort()
		return
	}
}

func (t *api) soundsImport(ctx *gin.Context) {
	user := ctx.MustGet(userKey).(*database.User)

	file, _, err := ctx.Request.FormFile("file")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, ErrFileRequired)
		return
	}
	defer file.Close()

	// The archive is read twice, as meta.json may be located after the sound
	// files in the archive.
	metas, err := soundarchive.ReadMeta(file)
	if err != nil {
		slog.Debug("failed reading sound archive meta", "err", err)
		ctx.JSON(http.StatusBadRequest, ErrInvalidArchive)
		return
	}

	if _, err = file.Seek(0, io.SeekStart); err != nil {
		slog.Error("failed rewinding uploaded sound archive", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	resp := models.SoundImportResponse{
		Imported: []*models.SoundResponse{},
		Skipped:  []models.SoundImportSkipped{},
	}

	pending := make(map[string]soundarchive.Meta, len(metas))
	for _, meta := range metas {
		if !isValidSoundHandle(meta.Name) {
			resp.Skipped = append(resp.Skipped, models.SoundImportSkipped{
				Name:   meta.Name,
				Reason: "invalid name",
			})
			continue
		}
		pending[meta.Name] = meta
	}

	err = soundarchive.ReadSounds(file, func(name string, content io.Reader) error {
		meta, ok := pending[name]
		if !ok {
			return nil
		}
		delete(pending, name)

		sound, reason, err := t.importSound(meta, content, user)
		if err != nil {
			return err
		}
		if reason != "" {
			resp.Skipped = append(resp.Skipped, models.SoundImportSkipped{
				Name:   name,
				Reason: reason,
			})
			return nil
		}

		soundResponse := models.SoundToResponse(sound)
		resp.Imported = append(resp.Imported, soundResponse)
		t.sseManager.Broadcast(sse.Event{
			Event: sse.EventTypeSoundCreate,
			Data:  sse.EventDataSoundCreate{Sound: soundResponse},
		})
		return nil
	})
	if err != nil {
		slog.Error("failed importing sound archive", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	for name := range pending {
		resp.Skipped = append(resp.Skipped, models.SoundImportSkipped{
			Name:   name,
			Reason: "missing sound file",
		})
	}

	ctx.JSON(http.StatusOK, resp)
}

// importSound stores the given sound content and creates the sound in the
// database. If the sound can not be imported due to its contents or a
// conflict, a non-empty skipReason is returned. Errors are only returned on
// unexpected failures.
func (t *api) importSound(
	meta soundarchive.Meta,
	content io.Reader,
	owner *database.User,
) (
	sound *database.Sound,
	skipReason string,
	err error,
) {
	_, err = t.db.GetSoundByHandle(meta.Name)
	if err == nil {
		return nil, "a sound with this name already exists", nil
	}
	if err != database.ErrNotFound {
		return nil, "", fmt.Errorf("failed checking sound handle availability: %w", err)
	}

	data, err := io.ReadAll(io.LimitReader(content, maxImportSoundSize+1))
	if err != nil {
		return nil, "", fmt.Errorf("failed reading sound file from archive: %w", err)
	}
	if len(data) > maxImportSoundSize {
		return nil, "sound file is too large", nil
	}
	if !bytes.HasPrefix(data, oggMagic) {
		return nil, "sound file is not Ogg encoded", nil
	}

	randBytes := make([]byte, 8)
	if _, err = rand.Read(randBytes); err != nil {
		return nil, "", fmt.Errorf("failed generating random bytes: %w", err)
	}
	storageID := strings.ToLower(meta.Name) + "-" + hex.EncodeToString(randBytes)

	if err = t.storage.Store(storageID, bytes.NewReader(data)); err != nil {
		return nil, "", fmt.Errorf("failed storing sound file: %w", err)
	}

	sound, err = t.db.CreateSound(meta.Name, storageID, meta.Tags, owner.ID)
	if err != nil {
		_ = t.storage.Delete(storageID)
		return nil, "", fmt.Errorf("failed creating sound in database: %w", err)
	}
	sound.Owner = owner

	return sound, "", nil
}

func (t *api) loadSoundFile(storageID string) (content []byte, err error) {
	file, err := t.storage.Load(storageID)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	return io.ReadAll(file)
}
