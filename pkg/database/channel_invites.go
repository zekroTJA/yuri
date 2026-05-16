package database

import (
	"time"

	"gorm.io/gorm"
)

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

func (t *Database) RedeemChannelInvite(code string, userID uint) (*Channel, error) {
	var channel Channel
	err := t.db.Transaction(func(tx *gorm.DB) error {
		var invite ChannelInvite
		if res := tx.Where("code = ?", code).First(&invite); res.Error != nil {
			return mapError(res.Error)
		}

		if invite.ExpiresAt != nil && time.Now().After(*invite.ExpiresAt) {
			return ErrInviteExpired
		}

		var c Channel
		if res := tx.Preload("Members").First(&c, invite.ChannelID); res.Error != nil {
			return mapError(res.Error)
		}

		alreadyMember := c.CreatorID == userID
		if !alreadyMember {
			for _, m := range c.Members {
				if m.ID == userID {
					alreadyMember = true
					break
				}
			}
		}

		if !alreadyMember {
			if invite.MaxActivations > 0 && invite.Activations >= invite.MaxActivations {
				return ErrInviteExhausted
			}

			user := &User{Model: gorm.Model{ID: userID}}
			if err := tx.Model(&c).Association("Members").Append(user); err != nil {
				return err
			}

			invite.Activations++
			if res := tx.Save(&invite); res.Error != nil {
				return mapError(res.Error)
			}
		}

		if res := tx.Preload("Creator").Preload("Members").First(&channel, invite.ChannelID); res.Error != nil {
			return mapError(res.Error)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &channel, nil
}
