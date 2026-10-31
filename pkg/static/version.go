package static

import (
	_ "embed"
)

var (
	//go:embed version.txt
	Version string
	//go:embed builddate.txt
	BuildDate string
)
