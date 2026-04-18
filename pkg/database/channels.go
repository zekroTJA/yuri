package database

func (t *Database) CreateChannel(name string, ownerID uint) (*Channel, error) {
	channel := &Channel{
		Name:    name,
		OwnerID: ownerID,
	}
	res := t.db.Create(channel)
	return channel, mapError(res.Error)
}

func (t *Database) GetChannelByID(id uint) (*Channel, error) {
	var channel Channel
	res := t.db.Preload("Members").First(&channel, id)
	return &channel, mapError(res.Error)
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
