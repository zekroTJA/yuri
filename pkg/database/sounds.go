package database

import (
	"strings"

	"gorm.io/gorm"
)

func (t *Database) GetSoundByHandle(handle string) (*Sound, error) {
	var sound Sound
	res := t.db.Where("handle = ?", handle).First(&sound)
	return &sound, mapError(res.Error)
}

func (t *Database) GetSoundByID(id uint) (*Sound, error) {
	var sound Sound
	res := t.db.Preload("Owner").First(&sound, id)
	return &sound, mapError(res.Error)
}

// GetRandomSound returns a random sound which has none of the given tags.
// Tags are matched case-insensitively.
func (t *Database) GetRandomSound(excludedTags []string) (*Sound, error) {
	var sound Sound
	query := t.db.Order("RANDOM()")
	if len(excludedTags) > 0 {
		lowerExcludedTags := make([]string, len(excludedTags))
		for i, tag := range excludedTags {
			lowerExcludedTags[i] = strings.ToLower(tag)
		}
		query = query.Where(
			"NOT EXISTS (SELECT 1 FROM json_each(sounds.tags) WHERE LOWER(json_each.value) IN ?)",
			lowerExcludedTags)
	}
	res := query.Take(&sound)
	return &sound, mapError(res.Error)
}

func (t *Database) ListSounds() ([]*Sound, error) {
	var sounds []*Sound
	res := t.db.Preload("Owner").Find(&sounds)
	return sounds, mapError(res.Error)
}

func (t *Database) CreateSound(handle string, storageID string, tags []string, ownerID uint) (*Sound, error) {
	sound := &Sound{
		Handle:    handle,
		StorageId: storageID,
		Tags:      tags,
		OwnerID:   ownerID,
	}
	res := t.db.Create(sound)
	return sound, mapError(res.Error)
}

func (t *Database) UpdateSound(id uint, handle string, tags []string) (*Sound, error) {
	var sound Sound
	if res := t.db.First(&sound, id); res.Error != nil {
		return nil, mapError(res.Error)
	}
	sound.Handle = handle
	sound.Tags = tags
	res := t.db.Save(&sound)
	return &sound, mapError(res.Error)
}

func (t *Database) UpdateSoundStorageID(id uint, storageID string) error {
	res := t.db.Model(&Sound{}).Where("id = ?", id).Update("storage_id", storageID)
	return mapError(res.Error)
}

func (t *Database) DeleteSound(id uint) error {
	res := t.db.Delete(&Sound{}, id)
	return mapError(res.Error)
}

func mapError(err error) error {
	if err == gorm.ErrRecordNotFound {
		return ErrNotFound
	}
	return err
}
