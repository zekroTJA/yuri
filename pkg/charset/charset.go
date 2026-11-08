package charset

import (
	"bytes"
	"fmt"
	"slices"
)

type runeRange [2]rune

type Charset struct {
	ranges []runeRange
	runes  []rune
}

func New(input string) (*Charset, error) {
	return parse(input)
}

func MustNew(input string) *Charset {
	t, err := New(input)
	if err != nil {
		panic(fmt.Sprintf(`failed parsing charset "%s": %s`, input, err.Error()))
	}
	return t
}

func (t *Charset) MatchRune(r rune) bool {
	if slices.Contains(t.runes, r) {
		return true
	}
	for _, rng := range t.ranges {
		if r >= rng[0] && r <= rng[1] {
			return true
		}
	}
	return false
}

func (t *Charset) MatchString(s string) bool {
	for _, r := range []rune(s) {
		if !t.MatchRune(r) {
			return false
		}
	}
	return true
}

func (t *Charset) ReplaceNotMatching(s string, replace string) string {
	var buf bytes.Buffer
	buf.Grow(len(s) * 2)

	for _, r := range []rune(s) {
		if t.MatchRune(r) {
			_, _ = buf.WriteRune(r)
			continue
		}
		if replace != "" {
			_, _ = buf.WriteString(replace)
		}
	}

	return buf.String()
}
