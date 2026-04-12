package database

import "gorm.io/gorm"

func (t *Database) CreateUser(handle string, passwordHash []byte) (*User, error) {
	user := &User{
		Handle:       handle,
		PasswordHash: passwordHash,
	}
	res := t.db.Create(user)
	return user, res.Error
}

func (t *Database) GetUserByHandle(handle string) (*User, error) {
	var user User
	res := t.db.Where("handle = ?", handle).First(&user)
	if res.Error == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &user, res.Error
}

func (t *Database) GetUserByID(id uint) (*User, error) {
	var user User
	res := t.db.First(&user, id)
	if res.Error == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &user, res.Error
}
