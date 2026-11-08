package charset

import (
	"errors"
	"slices"
	"testing"
)

func TestParse(t *testing.T) {
	cases := []struct {
		input  string
		ranges []runeRange
		runes  []rune
		error  error
	}{
		// positive tests
		{input: "a", runes: []rune{'a'}},
		{input: "a-z", ranges: []runeRange{{'a', 'z'}}},
		{input: `a-z\-`, runes: []rune{'-'}, ranges: []runeRange{{'a', 'z'}}},
		{input: `\-\\a`, runes: []rune{'-', '\\', 'a'}},
		{input: `\-`, runes: []rune{'-'}},
		{input: `\-a-z`, runes: []rune{'-'}, ranges: []runeRange{{'a', 'z'}}},
		{input: `a-zA\-Z`, runes: []rune{'A', '-', 'Z'}, ranges: []runeRange{{'a', 'z'}}},
		{input: "a-zA-Z0-9", ranges: []runeRange{{'a', 'z'}, {'A', 'Z'}, {'0', '9'}}},
		{input: "a-z0-9ABC", runes: []rune{'A', 'B', 'C'}, ranges: []runeRange{{'a', 'z'}, {'0', '9'}}},
		{input: "a-zABC0-9", runes: []rune{'A', 'B', 'C'}, ranges: []runeRange{{'a', 'z'}, {'0', '9'}}},
		{input: "Aa-zB0-9C", runes: []rune{'A', 'B', 'C'}, ranges: []runeRange{{'a', 'z'}, {'0', '9'}}},

		// negative tests
		{input: "", error: ErrEmptyInput},
		{input: "-a", error: ErrInvalidRange},
		{input: "-aA", error: ErrInvalidRange},
		{input: "a-", error: ErrInvalidRange},
		{input: "1a-", error: ErrInvalidRange},
		{input: "z-a", error: ErrInvalidRange},
		{input: "a--z", error: ErrInvalidRange},
		{input: "-", error: ErrInvalidRange},
		{input: `\`, error: ErrInvalidEscape},
		{input: `\\\`, error: ErrInvalidEscape},
		{input: `\-\`, error: ErrInvalidEscape},
	}

	for _, c := range cases {
		t.Run("input:"+c.input, func(t *testing.T) {
			cs, err := parse(c.input)
			if err != nil {
				if c.error == nil {
					t.Errorf("unexpected error: %s", err)
				} else if !errors.Is(err, c.error) {
					t.Errorf("errors do not match:\n\texpected: %s\n\treceived: %s", c.error, err)
				}
				return
			}

			if c.error != nil {
				t.Fatalf("expected error but got none:\n\texpected: %s", c.error)
			}

			if cs == nil {
				t.Fatal("expected charset but got nil")
			}

			if !slices.Equal(cs.ranges, c.ranges) {
				t.Errorf("ranges do not match:\n\texpected: %q\n\treceived: %q", c.ranges, cs.ranges)
			}

			if !slices.Equal(cs.runes, c.runes) {
				t.Errorf("runes do not match:\n\texpected: %q\n\treceived: %q", c.runes, cs.runes)
			}
		})
	}
}
