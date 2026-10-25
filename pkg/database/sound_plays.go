package database

import (
	"time"

	"gorm.io/gorm"
)

// SoundPlayCount holds the number of times a sound has been played.
type SoundPlayCount struct {
	Sound *Sound
	Count int64
}

func (t *Database) CreateSoundPlay(soundID uint, userID uint) (*SoundPlay, error) {
	play := &SoundPlay{
		SoundID: soundID,
		UserID:  userID,
	}
	res := t.db.Create(play)
	return play, mapError(res.Error)
}

// ListLatestSoundPlays returns the latest limit sound play log entries,
// ordered from newest to oldest. Plays of deleted sounds are included.
func (t *Database) ListLatestSoundPlays(limit int) ([]*SoundPlay, error) {
	var plays []*SoundPlay
	res := t.db.
		Preload("Sound", func(db *gorm.DB) *gorm.DB { return db.Unscoped() }).
		Preload("User").
		Order("created_at DESC").
		Limit(limit).
		Find(&plays)
	return plays, mapError(res.Error)
}

// ListMostPlayedSounds returns the limit most played sounds, ordered by
// their play count descending. When since is not nil, only plays at or
// after since are counted. Deleted sounds are not included.
func (t *Database) ListMostPlayedSounds(limit int, since *time.Time) ([]*SoundPlayCount, error) {
	type soundIDCount struct {
		SoundID uint
		Count   int64
	}

	query := t.soundPlaysOfExistingSounds(since).
		Select("sound_plays.sound_id AS sound_id, COUNT(*) AS count").
		Group("sound_plays.sound_id").
		Order("count DESC").
		Order("sound_plays.sound_id ASC").
		Limit(limit)

	var counts []soundIDCount
	if res := query.Scan(&counts); res.Error != nil {
		return nil, mapError(res.Error)
	}

	if len(counts) == 0 {
		return []*SoundPlayCount{}, nil
	}

	soundIDs := make([]uint, len(counts))
	for i, c := range counts {
		soundIDs[i] = c.SoundID
	}

	var sounds []*Sound
	if res := t.db.Preload("Owner").Where("id IN ?", soundIDs).Find(&sounds); res.Error != nil {
		return nil, mapError(res.Error)
	}

	soundsByID := make(map[uint]*Sound, len(sounds))
	for _, s := range sounds {
		soundsByID[s.ID] = s
	}

	result := make([]*SoundPlayCount, 0, len(counts))
	for _, c := range counts {
		sound, ok := soundsByID[c.SoundID]
		if !ok {
			continue
		}
		result = append(result, &SoundPlayCount{
			Sound: sound,
			Count: c.Count,
		})
	}

	return result, nil
}

// CountSoundPlays returns the total number of plays. When since is not nil,
// only plays at or after since are counted. Plays of deleted sounds are not
// counted.
func (t *Database) CountSoundPlays(since *time.Time) (int64, error) {
	var count int64
	res := t.soundPlaysOfExistingSounds(since).Count(&count)
	return count, mapError(res.Error)
}

// soundPlaysOfExistingSounds returns a query on all sound plays of sounds
// which are not deleted. When since is not nil, only plays at or after since
// are included.
func (t *Database) soundPlaysOfExistingSounds(since *time.Time) *gorm.DB {
	query := t.db.Model(&SoundPlay{}).
		Joins("JOIN sounds ON sounds.id = sound_plays.sound_id AND sounds.deleted_at IS NULL")
	if since != nil {
		query = query.Where("sound_plays.created_at >= ?", *since)
	}
	return query
}
