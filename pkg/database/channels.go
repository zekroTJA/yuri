package database

import "gorm.io/gorm"

func (t *Database) CreateChannel(name string, creatorID uint) (*Channel, error) {
	channel := &Channel{
		Name:      name,
		CreatorID: creatorID,
	}
	res := t.db.Create(channel)
	return channel, mapError(res.Error)
}

func (t *Database) GetChannelByID(id uint) (*Channel, error) {
	var channel Channel
	res := t.db.Preload("Creator").Preload("Members").First(&channel, id)
	return &channel, mapError(res.Error)
}

func (t *Database) ListChannelsByUser(userID uint) ([]*Channel, error) {
	var channels []*Channel
	res := t.db.Preload("Creator").Preload("Members").
		Joins("LEFT JOIN channel_members cm ON cm.channel_id = channels.id").
		Where("channels.creator_id = ? OR cm.user_id = ?", userID, userID).
		Group("channels.id").
		Find(&channels)
	return channels, mapError(res.Error)
}

func (t *Database) UpdateChannel(id uint, name string) (*Channel, error) {
	var channel Channel
	if res := t.db.First(&channel, id); res.Error != nil {
		return nil, mapError(res.Error)
	}
	channel.Name = name
	res := t.db.Save(&channel)
	return &channel, mapError(res.Error)
}

func (t *Database) DeleteChannel(id uint) error {
	res := t.db.Delete(&Channel{}, id)
	return mapError(res.Error)
}

func (t *Database) AddChannelMember(channelID uint, userID uint) error {
	channel := &Channel{Model: gorm.Model{ID: channelID}}
	user := &User{Model: gorm.Model{ID: userID}}
	err := t.db.Model(channel).Association("Members").Append(user)
	return mapError(err)
}

func (t *Database) RemoveChannelMember(channelID uint, userID uint) error {
	channel := &Channel{Model: gorm.Model{ID: channelID}}
	user := &User{Model: gorm.Model{ID: userID}}
	err := t.db.Model(channel).Association("Members").Delete(user)
	return mapError(err)
}
