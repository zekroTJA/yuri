package api

import (
	"slices"
	"testing"

	"github.com/zekrotja/yuri/pkg/database"
	"gorm.io/gorm"
)

func TestSortChannelsByOrder(t *testing.T) {
	newChannels := func(ids ...uint) []*database.Channel {
		channels := make([]*database.Channel, len(ids))
		for i, id := range ids {
			channels[i] = &database.Channel{Model: gorm.Model{ID: id}}
		}
		return channels
	}
	channelIDs := func(channels []*database.Channel) []uint {
		ids := make([]uint, len(channels))
		for i, c := range channels {
			ids[i] = c.ID
		}
		return ids
	}

	tests := []struct {
		name         string
		channels     []uint
		channelOrder []uint
		expected     []uint
	}{
		{
			name:         "no order keeps original order",
			channels:     []uint{1, 2, 3},
			channelOrder: nil,
			expected:     []uint{1, 2, 3},
		},
		{
			name:         "full order",
			channels:     []uint{1, 2, 3},
			channelOrder: []uint{3, 1, 2},
			expected:     []uint{3, 1, 2},
		},
		{
			name:         "unordered channels are appended in original order",
			channels:     []uint{1, 2, 3, 4},
			channelOrder: []uint{3, 1},
			expected:     []uint{3, 1, 2, 4},
		},
		{
			name:         "unknown channel IDs in order are ignored",
			channels:     []uint{1, 2},
			channelOrder: []uint{5, 2, 7, 1},
			expected:     []uint{2, 1},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			channels := newChannels(test.channels...)
			sortChannelsByOrder(channels, test.channelOrder)
			if actual := channelIDs(channels); !slices.Equal(actual, test.expected) {
				t.Errorf("expected %v, got %v", test.expected, actual)
			}
		})
	}
}
