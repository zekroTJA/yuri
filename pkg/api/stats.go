package api

import (
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zekrotja/yuri/pkg/api/models"
)

const (
	statsDefaultLimit = 10
	statsMaxLimit     = 100
	statsDateLayout   = "2006-01-02"
)

// statsScoreboard godoc
//
//	@Summary		Get sound scoreboard
//	@Description	Lists the most played sounds ordered by their play count together with the total number of plays of all sounds. When "since" is given, only plays from that point in time until now are counted, otherwise all time. Plays of deleted sounds are not counted. Requires the "read" scope when using an API key.
//	@Tags			Stats
//	@Produce		json
//	@Security		ApiKeyAuth
//	@Param			limit	query		int		false	"Number of sounds to return (1-100)"	default(10)
//	@Param			since	query		string	false	"Date (YYYY-MM-DD) or RFC3339 timestamp from which plays are counted"
//	@Success		200		{object}	models.ScoreboardResponse
//	@Failure		400		{object}	api.ErrorResponse
//	@Failure		401		{object}	api.ErrorResponse
//	@Failure		500		{object}	api.ErrorResponse
//	@Router			/stats/scoreboard [get]
func (t *api) statsScoreboard(ctx *gin.Context) {
	limit, ok := parseLimitQuery(ctx)
	if !ok {
		ctx.JSON(http.StatusBadRequest, ErrInvalidLimit)
		return
	}

	var since *time.Time
	if rawSince := ctx.Query("since"); rawSince != "" {
		parsed, err := parseSinceQuery(rawSince)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, ErrInvalidSince)
			return
		}
		since = &parsed
	}

	counts, err := t.db.ListMostPlayedSounds(limit, since)
	if err != nil {
		slog.Error("failed listing most played sounds from database", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	totalPlays, err := t.db.CountSoundPlays(since)
	if err != nil {
		slog.Error("failed counting sound plays in database", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	sounds := make([]*models.SoundPlayCountResponse, len(counts))
	for i, c := range counts {
		sounds[i] = models.SoundPlayCountToResponse(c)
	}

	ctx.JSON(http.StatusOK, models.ScoreboardResponse{
		TotalPlays: totalPlays,
		Sounds:     sounds,
	})
}

// statsPlays godoc
//
//	@Summary		List latest sound plays
//	@Description	Lists the latest entries of the sound play log ordered from newest to oldest. Plays of deleted sounds are included. Requires the "read" scope when using an API key.
//	@Tags			Stats
//	@Produce		json
//	@Security		ApiKeyAuth
//	@Param			limit	query		int	false	"Number of entries to return (1-100)"	default(10)
//	@Success		200		{array}		models.SoundPlayResponse
//	@Failure		400		{object}	api.ErrorResponse
//	@Failure		401		{object}	api.ErrorResponse
//	@Failure		500		{object}	api.ErrorResponse
//	@Router			/stats/plays [get]
func (t *api) statsPlays(ctx *gin.Context) {
	limit, ok := parseLimitQuery(ctx)
	if !ok {
		ctx.JSON(http.StatusBadRequest, ErrInvalidLimit)
		return
	}

	plays, err := t.db.ListLatestSoundPlays(limit)
	if err != nil {
		slog.Error("failed listing sound plays from database", "err", err)
		ctx.JSON(http.StatusInternalServerError, ErrInternal)
		return
	}

	resp := make([]*models.SoundPlayResponse, len(plays))
	for i, p := range plays {
		resp[i] = models.SoundPlayToResponse(p)
	}

	ctx.JSON(http.StatusOK, resp)
}

// parseLimitQuery parses the "limit" query parameter. When it is not set,
// statsDefaultLimit is returned. ok is false when the value is not a number
// between 1 and statsMaxLimit.
func parseLimitQuery(ctx *gin.Context) (limit int, ok bool) {
	rawLimit := ctx.Query("limit")
	if rawLimit == "" {
		return statsDefaultLimit, true
	}
	limit, err := strconv.Atoi(rawLimit)
	if err != nil || limit < 1 || limit > statsMaxLimit {
		return 0, false
	}
	return limit, true
}

// parseSinceQuery parses either a date (YYYY-MM-DD), which is interpreted as
// the start of that day in the server's local time zone, or an RFC3339
// timestamp.
func parseSinceQuery(rawSince string) (time.Time, error) {
	if since, err := time.ParseInLocation(statsDateLayout, rawSince, time.Local); err == nil {
		return since, nil
	}
	since, err := time.Parse(time.RFC3339, rawSince)
	if err != nil {
		return time.Time{}, err
	}
	return since.Local(), nil
}
