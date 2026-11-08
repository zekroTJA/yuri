package ffmpeg

import (
	"slices"
	"testing"
)

func TestBuildAudioFilterChain(t *testing.T) {
	normalized := []string{filterLoudnessNormalization}
	overdriven := []string{filterLoudnessNormalization, filterOverdriveGain, filterOverdriveClip}

	testCases := []struct {
		name     string
		filters  []Filter
		expected []string
	}{
		{name: "none", filters: nil, expected: nil},
		{name: "normalize", filters: []Filter{FilterNormalize}, expected: normalized},
		{name: "overdrive", filters: []Filter{FilterOverdrive}, expected: overdriven},
		{name: "both", filters: []Filter{FilterOverdrive, FilterNormalize}, expected: overdriven},
		{name: "duplicates", filters: []Filter{FilterNormalize, FilterNormalize}, expected: normalized},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			audioFilters, err := buildAudioFilterChain(testCase.filters)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !slices.Equal(audioFilters, testCase.expected) {
				t.Fatalf("expected %v, got %v", testCase.expected, audioFilters)
			}
		})
	}

	if _, err := buildAudioFilterChain([]Filter{Filter(0)}); err == nil {
		t.Fatal("expected error for unknown filter")
	}
}
