package models

import (
	"time"

	"github.com/zekrotja/yuri/pkg/database"
)

type SoundPlayCountResponse struct {
	Sound *SoundResponse `json:"sound"`
	Count int64          `json:"count"`
}

type ScoreboardResponse struct {
	// TotalPlays is the number of plays of all sounds in the requested time range.
	TotalPlays int64                     `json:"total_plays"`
	Sounds     []*SoundPlayCountResponse `json:"sounds"`
}

type SoundPlaySoundResponse struct {
	ID      uint   `json:"id"`
	Handle  string `json:"handle"`
	Deleted bool   `json:"deleted"`
}

type SoundPlayResponse struct {
	ID       uint                   `json:"id"`
	PlayedAt time.Time              `json:"played_at"`
	Sound    SoundPlaySoundResponse `json:"sound"`
	User     SoundUserResponse      `json:"user"`
}

func SoundPlayCountToResponse(c *database.SoundPlayCount) *SoundPlayCountResponse {
	return &SoundPlayCountResponse{
		Sound: SoundToResponse(c.Sound),
		Count: c.Count,
	}
}

func SoundPlayToResponse(p *database.SoundPlay) *SoundPlayResponse {
	sound := SoundPlaySoundResponse{ID: p.SoundID}
	if p.Sound != nil {
		sound = SoundPlaySoundResponse{
			ID:      p.Sound.ID,
			Handle:  p.Sound.Handle,
			Deleted: p.Sound.DeletedAt.Valid,
		}
	}
	user := SoundUserResponse{ID: p.UserID}
	if p.User != nil {
		user = SoundUserResponse{ID: p.User.ID, Handle: p.User.Handle}
	}
	return &SoundPlayResponse{
		ID:       p.ID,
		PlayedAt: p.CreatedAt,
		Sound:    sound,
		User:     user,
	}
}
