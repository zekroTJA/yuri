package charset

import (
	"testing"
)

func TestMatchRune(t *testing.T) {
	charset := Charset{
		ranges: []runeRange{{'a', 'z'}, {'0', '9'}},
		runes:  []rune{'_', 'Ä', '🐱'},
	}

	cases := []struct {
		input    rune
		expected bool
	}{
		// single runes
		{input: '_', expected: true},
		{input: 'Ä', expected: true},
		{input: '🐱', expected: true},

		// range bounds and inner values
		{input: 'a', expected: true},
		{input: 'm', expected: true},
		{input: 'z', expected: true},
		{input: '0', expected: true},
		{input: '5', expected: true},
		{input: '9', expected: true},

		// directly outside of range bounds
		{input: 'a' - 1, expected: false},
		{input: 'z' + 1, expected: false},
		{input: '0' - 1, expected: false},
		{input: '9' + 1, expected: false},

		// not contained at all
		{input: 'A', expected: false},
		{input: 'ä', expected: false},
		{input: '-', expected: false},
		{input: ' ', expected: false},
		{input: 0, expected: false},
	}

	for _, c := range cases {
		t.Run("input:"+string(c.input), func(t *testing.T) {
			received := charset.MatchRune(c.input)
			if received != c.expected {
				t.Errorf("match result does not match for %q:\n\texpected: %t\n\treceived: %t",
					c.input, c.expected, received)
			}
		})
	}
}

func TestMatchRune_EmptyCharset(t *testing.T) {
	charset := Charset{}

	for _, r := range []rune{'a', '0', ' ', 0} {
		if charset.MatchRune(r) {
			t.Errorf("empty charset must not match %q", r)
		}
	}
}

func TestMatchString(t *testing.T) {
	charset := Charset{
		ranges: []runeRange{{'a', 'z'}, {'0', '9'}},
		runes:  []rune{'_', 'Ä', '🐱'},
	}

	cases := []struct {
		input    string
		expected bool
	}{
		// matching
		{input: "", expected: true},
		{input: "a", expected: true},
		{input: "hello_world", expected: true},
		{input: "abc123", expected: true},
		{input: "Äpfel", expected: true},
		{input: "🐱🐱_cat", expected: true},
		{input: "az09_", expected: true},

		// not matching
		{input: "A", expected: false},
		{input: "Hello", expected: false},
		{input: "hello world", expected: false},
		{input: "hello!", expected: false},
		{input: "!hello", expected: false},
		{input: "hel-lo", expected: false},
		{input: "äpfel", expected: false},
		{input: "🐶", expected: false},
	}

	for _, c := range cases {
		t.Run("input:"+c.input, func(t *testing.T) {
			received := charset.MatchString(c.input)
			if received != c.expected {
				t.Errorf("match result does not match for %q:\n\texpected: %t\n\treceived: %t",
					c.input, c.expected, received)
			}
		})
	}
}

func TestMatchString_EmptyCharset(t *testing.T) {
	charset := Charset{}

	if !charset.MatchString("") {
		t.Error("empty charset must match empty string")
	}

	if charset.MatchString("a") {
		t.Error("empty charset must not match non-empty string")
	}
}

func TestReplaceNotMatching(t *testing.T) {
	charset := Charset{
		ranges: []runeRange{{'a', 'z'}, {'0', '9'}},
		runes:  []rune{'_', 'Ä', '🐱'},
	}

	cases := []struct {
		name     string
		input    string
		replace  string
		expected string
	}{
		// nothing to replace
		{name: "empty input", input: "", replace: "-", expected: ""},
		{name: "all matching", input: "hello_world123", replace: "-", expected: "hello_world123"},
		{name: "all matching multibyte", input: "Äpfel🐱", replace: "-", expected: "Äpfel🐱"},

		// single rune replacement
		{name: "replace in middle", input: "hello world", replace: "_", expected: "hello_world"},
		{name: "replace at start", input: "!hello", replace: "_", expected: "_hello"},
		{name: "replace at end", input: "hello!", replace: "_", expected: "hello_"},
		{name: "replace consecutive", input: "a  b", replace: "_", expected: "a__b"},
		{name: "replace all", input: "ABC", replace: "_", expected: "___"},
		{name: "replace multibyte", input: "äpfel🐶", replace: "_", expected: "_pfel_"},

		// replacement of other lengths
		{name: "multi rune replacement", input: "a b", replace: "<->", expected: "a<->b"},
		{name: "multibyte replacement", input: "a b", replace: "🐱", expected: "a🐱b"},
		{name: "empty replacement removes", input: "Hello World!", replace: "", expected: "elloorld"},
		{name: "empty replacement removes all", input: "ABC", replace: "", expected: ""},

		// replacement is not checked against the charset
		{name: "non matching replacement", input: "a b", replace: "X", expected: "aXb"},

		// invalid UTF-8 is decoded as U+FFFD and therefore replaced per invalid byte
		{name: "invalid utf8", input: "a\xffb", replace: "_", expected: "a_b"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			received := charset.ReplaceNotMatching(c.input, c.replace)
			if received != c.expected {
				t.Errorf("result does not match for input %q with replacement %q:\n\texpected: %q\n\treceived: %q",
					c.input, c.replace, c.expected, received)
			}
		})
	}
}

func TestReplaceNotMatching_EmptyCharset(t *testing.T) {
	charset := Charset{}

	if received := charset.ReplaceNotMatching("ab c", "_"); received != "____" {
		t.Errorf("expected all runes to be replaced, received: %q", received)
	}

	if received := charset.ReplaceNotMatching("ab c", ""); received != "" {
		t.Errorf("expected all runes to be removed, received: %q", received)
	}
}
