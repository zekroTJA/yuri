package database

import "time"

func (t *Database) CreateChannelInvite(
	code string,
	channelID uint,
	creatorID uint,
	maxActivations uint,
	expiresAt *time.Time,
) (*ChannelInvite, error) {
	invite := &ChannelInvite{
		Code:           code,
		ChannelID:      channelID,
		CreatorID:      creatorID,
		MaxActivations: maxActivations,
		ExpiresAt:      expiresAt,
	}
	res := t.db.Create(invite)
	return invite, mapError(res.Error)
}

func (t *Database) GetChannelInviteByID(id uint) (*ChannelInvite, error) {
	var invite ChannelInvite
	res := t.db.First(&invite, id)
	return &invite, mapError(res.Error)
}

func (t *Database) GetChannelInviteByCode(code string) (*ChannelInvite, error) {
	var invite ChannelInvite
	res := t.db.Where("code = ?", code).First(&invite)
	return &invite, mapError(res.Error)
}

func (t *Database) ListChannelInvitesByChannel(channelID uint) ([]*ChannelInvite, error) {
	var invites []*ChannelInvite
	res := t.db.Where("channel_id = ?", channelID).Find(&invites)
	return invites, mapError(res.Error)
}

func (t *Database) DeleteChannelInvite(id uint) error {
	res := t.db.Delete(&ChannelInvite{}, id)
	return mapError(res.Error)
}

func (t *Database) UpdateChannelInvite(invite *ChannelInvite) (*ChannelInvite, error) {
	res := t.db.Save(invite)
	return invite, mapError(res.Error)
}
