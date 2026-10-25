package api

import (
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"github.com/zekrotja/yuri/pkg/database"
	"github.com/zekrotja/yuri/pkg/ffmpeg"
	"github.com/zekrotja/yuri/pkg/util"
)

var soundHandlePattern = regexp.MustCompile(`^[a-zA-Z0-9_\-]+$`)

var filterMap = map[string]ffmpeg.Filter{
	"normalize": ffmpeg.FilterNormalize,
	"overdrive": ffmpeg.FilterOverdrive,
}

// isValidSoundHandle reports whether the given handle only consists of
// alphanumeric characters, underscores and dashes, so that it can safely be
// used as part of file names, i.e. in the storage ID or in sound archives.
func isValidSoundHandle(handle string) bool {
	return soundHandlePattern.MatchString(handle)
}

// isValidMediaURL reports whether the given URL is an absolute http or https
// URL which can be passed to the media downloader.
func isValidMediaURL(rawURL string) bool {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	return (parsed.Scheme == "http" || parsed.Scheme == "https") && parsed.Host != ""
}

// newStorageID generates a unique storage ID for a sound with the given
// handle.
func newStorageID(handle string) (string, error) {
	suffix := util.GenerateRandomString(8, util.DefaultCharset)
	return strings.ToLower(handle) + "-" + suffix, nil
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
