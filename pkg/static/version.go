package static

import (
	_ "embed"
	"strings"
)

var (
	//go:embed version.txt
	version string
	//go:embed builddate.txt
	buildDate string
)

func Version() string {
	return strings.TrimSpace(version)
}

func BuildDate() string {
	return strings.TrimSpace(buildDate)
}
