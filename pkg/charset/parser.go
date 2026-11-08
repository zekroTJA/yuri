package charset

import "github.com/pkg/errors"

func parse(input string) (t *Charset, err error) {
	if input == "" {
		return nil, ErrEmptyInput
	}

	runes := []rune(input)
	if runes[0] == '-' {
		return nil, errors.Wrap(ErrInvalidRange, "open range at start of input")
	}

	t = &Charset{}

	var (
		parsedRunes  []rune
		parsedRanges []runeRange
	)
	for {
		if len(runes) == 0 {
			break
		}

		runes, parsedRunes, parsedRanges, err = parseElement(runes)
		if err != nil {
			return nil, err
		}
		t.runes = append(t.runes, parsedRunes...)
		t.ranges = append(t.ranges, parsedRanges...)
	}

	return t, nil
}

func parseElement(runes []rune) (rest []rune, parsedRunes []rune, parsedRanges []runeRange, err error) {
	start := runes[0]
	if start == '-' {
		return nil, nil, nil, errors.Wrap(ErrInvalidRange, "open range with no predecessor")
	}

	if start == '\\' {
		if len(runes) == 1 {
			return nil, nil, nil, errors.Wrap(ErrInvalidEscape, "open escape sequence")
		}
		if runes[1] == '-' || runes[1] == '\\' {
			return runes[2:], []rune{runes[1]}, nil, nil
		}
		return nil, nil, nil, errors.Wrap(ErrInvalidEscape, "escape character followed by invalid character")
	}

	if len(runes) == 1 || runes[1] != '-' {
		return runes[1:], []rune{start}, nil, nil
	}

	if len(runes) == 2 {
		return nil, nil, nil, errors.Wrap(ErrInvalidRange, "open range at end of input")
	}

	end := runes[2]

	if end <= start {
		return nil, nil, nil, errors.Wrap(ErrInvalidRange, "range end is smaller or equal range start")
	}

	return runes[3:], nil, []runeRange{{start, end}}, nil
}
