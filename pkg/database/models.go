package database

import (
	"slices"
	"time"

	"gorm.io/gorm"
)

var models = []any{
	&User{},
	&APIKey{},
	&Sound{},
	&Channel{},
	&ChannelInvite{},
	&SoundPlay{},
}

type Scope string

const (
	ScopeRead   Scope = "read"
	ScopeWrite  Scope = "write"
	ScopeDelete Scope = "delete"
)

var Scopes = []Scope{ScopeRead, ScopeWrite, ScopeDelete}

type User struct {
	gorm.Model

	Handle       string
	PasswordHash []byte
}

type APIKey struct {
	gorm.Model

	Name   string
	Hash   []byte
	Salt   []byte
	Hint   string
	Scopes []Scope `gorm:"serializer:json"`

	OwnerID uint
	Owner   *User
}

type Sound struct {
	gorm.Model

	Handle    string
	StorageId string
	Tags      []string `gorm:"serializer:json"`

	OwnerID uint
	Owner   *User
}

type Channel struct {
	gorm.Model

	Name string
	// TagBlocklist contains tags of sounds which can not be played in the
	// channel. Tags are matched case-insensitively.
	TagBlocklist []string `gorm:"serializer:json"`

	CreatorID uint
	Creator   *User
	Members   []*User `gorm:"many2many:channel_members;"`
}

func (t *Channel) AssociatedUserIds() []uint {
	res := make([]uint, 0, len(t.Members)+1)
	res = append(res, t.CreatorID)
	for _, m := range t.Members {
		res = append(res, m.ID)
	}
	return res
}

// IsSoundBlocked returns true when the sound has at least one tag which is
// contained in the channel's tag blocklist.
func (t *Channel) IsSoundBlocked(sound *Sound) bool {
	for _, blockedTag := range t.TagBlocklist {
		if slices.Contains(sound.Tags, blockedTag) {
			return true
		}
	}
	return false
}

type ChannelInvite struct {
	gorm.Model

	Code           string `gorm:"uniqueIndex"`
	Activations    uint
	MaxActivations uint
	ExpiresAt      *time.Time

	ChannelID uint
	Channel   *Channel
	CreatorID uint
	Creator   *User
}

// SoundPlay is a log entry of a sound being played by a user. The time the
// sound has been played is stored as CreatedAt.
type SoundPlay struct {
	gorm.Model

	SoundID uint `gorm:"index"`
	Sound   *Sound
	UserID  uint
	User    *User
}
