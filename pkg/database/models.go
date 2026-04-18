package database

import "gorm.io/gorm"

var models = []any{
	&User{},
	&APIKey{},
	&Sound{},
	&Channel{},
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
	Tags      string
	Public    bool

	OwnerID uint
	Owner   *User
}

type Channel struct {
	gorm.Model

	Name string

	OwnerID uint
	Owner   *User
	Sounds  []*Sound `gorm:"many2many:channel_sounds;"`
	Members []*User  `gorm:"many2many:channel_members;"`
}
