package database

import "gorm.io/gorm"

var models = []any{
	&User{},
	&Sound{},
	&Channel{},
}

type User struct {
	gorm.Model

	Handle       string
	PasswordHash []byte
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
	Sounds  []*Sound
	Members []*User
}
