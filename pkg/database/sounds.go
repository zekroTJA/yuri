package database

import "gorm.io/gorm"

func (t *Database) GetSoundByHandle(handle string, ownerID uint) (*Sound, error) {
	var sound Sound
	res := t.db.Where("handle = ? AND owner_id = ?", handle, ownerID).First(&sound)
	return &sound, mapError(res.Error)
}

func (t *Database) CreateSound(handle, storageID, tags string, public bool, ownerID uint) (*Sound, error) {
	sound := &Sound{
		Handle:    handle,
		StorageId: storageID,
		Tags:      tags,
		Public:    public,
		OwnerID:   ownerID,
	}
	res := t.db.Create(sound)
	return sound, mapError(res.Error)
}

func mapError(err error) error {
	if err == gorm.ErrRecordNotFound {
		return ErrNotFound
	}
	return err
}
