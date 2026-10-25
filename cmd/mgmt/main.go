package main

import (
	"fmt"
	"os"

	"github.com/zekrotja/yuri/pkg/cli"
)

func main() {
	if err := cli.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %s\n", err.Error())
		os.Exit(1)
	}
}
