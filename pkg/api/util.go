package api

import (
	"strconv"
	"strings"

	"github.com/zekrotja/yuri/pkg/database"
	"github.com/zekrotja/yuri/pkg/ffmpeg"
)

var filterMap = map[string]ffmpeg.Filter{
	"normalize": ffmpeg.FilterNormalize,
	"overdrive": ffmpeg.FilterOverdrive,
}

// isValidSoundHandle reports whether the given handle can safely be used as
// part of file names, i.e. in the storage ID or in sound archives.
func isValidSoundHandle(handle string) bool {
	return handle != "" && !strings.ContainsAny(handle, `/\`)
}

func (t *api) getSoundByIDOrHandle(idOrHandle string) (*database.Sound, error) {
	if id, err := strconv.ParseUint(idOrHandle, 10, 64); err == nil {
		return t.db.GetSoundByID(uint(id))
	}
	return t.db.GetSoundByHandle(idOrHandle)
}

func channelHasMember(channel *database.Channel, userID uint) bool {
	for _, m := range channel.Members {
		if m.ID == userID {
			return true
		}
	}
	return false
}

func (t *api) findUserInChannel(userId uint) (channelId uint, ok bool) {
	for chanId, conns := range t.connections {
		if conns.Exists(userId) {
			return chanId, true
		}
	}
	return 0, false
}
