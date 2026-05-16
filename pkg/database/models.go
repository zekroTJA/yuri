package database

import (
	"time"

	"gorm.io/gorm"
)

var models = []any{
	&User{},
	&APIKey{},
	&Sound{},
	&Channel{},
	&ChannelInvite{},
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

	CreatorID uint
	Creator   *User
	Members   []*User `gorm:"many2many:channel_members;"`
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
