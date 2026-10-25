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

func (t *Database) ListUsers() ([]*User, error) {
	var users []*User
	res := t.db.Order("id ASC").Find(&users)
	return users, res.Error
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

func (t *Database) UpdateUserPassword(id uint, passwordHash []byte) error {
	res := t.db.Model(&User{}).Where("id = ?", id).Update("password_hash", passwordHash)
	return res.Error
}

// DeleteUser permanently deletes the user with all of their API keys and
// channel memberships. Channels created by the user are deleted together with
// their invites. Sounds and sound plays of the user are kept, because they are
// shared with all other users.
func (t *Database) DeleteUser(id uint) error {
	return t.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Unscoped().Where("owner_id = ?", id).Delete(&APIKey{}).Error; err != nil {
			return err
		}

		ownedChannelIDs := tx.Model(&Channel{}).Select("id").Where("creator_id = ?", id)

		if err := tx.Where("channel_id IN (?) OR creator_id = ?", ownedChannelIDs, id).
			Delete(&ChannelInvite{}).Error; err != nil {
			return err
		}

		if err := tx.Exec("DELETE FROM channel_members WHERE user_id = ? OR channel_id IN (?)",
			id, ownedChannelIDs).Error; err != nil {
			return err
		}

		if err := tx.Where("creator_id = ?", id).Delete(&Channel{}).Error; err != nil {
			return err
		}

		return tx.Unscoped().Delete(&User{}, id).Error
	})
}
