package models

import (
	"time"

	"github.com/zekrotja/yuri/pkg/database"
)

type SoundUserResponse struct {
	ID     uint   `json:"id"`
	Handle string `json:"handle"`
}

type SoundResponse struct {
	ID        uint              `json:"id"`
	CreatedAt time.Time         `json:"created_at"`
	UpdatedAt time.Time         `json:"updated_at"`
	Handle    string            `json:"handle"`
	Tags      []string          `json:"tags"`
	Creator   SoundUserResponse `json:"creator"`
}

type SoundUpdateRequest struct {
	Handle string   `json:"handle" binding:"required"`
	Tags   []string `json:"tags"`
}

// SoundTrimRequest defines the range of the sound to keep in seconds.
type SoundTrimRequest struct {
	Start float64 `json:"start"`
	End   float64 `json:"end" binding:"required"`
}

func SoundToResponse(s *database.Sound) *SoundResponse {
	creator := SoundUserResponse{}
	if s.Owner != nil {
		creator = SoundUserResponse{ID: s.Owner.ID, Handle: s.Owner.Handle}
	}
	return &SoundResponse{
		ID:        s.ID,
		CreatedAt: s.CreatedAt,
		UpdatedAt: s.UpdatedAt,
		Handle:    s.Handle,
		Tags:      s.Tags,
		Creator:   creator,
	}
}

type SoundImportSkipped struct {
	Name   string `json:"name"`
	Reason string `json:"reason"`
}

type SoundImportResponse struct {
	Imported []*SoundResponse     `json:"imported"`
	Skipped  []SoundImportSkipped `json:"skipped"`
}
