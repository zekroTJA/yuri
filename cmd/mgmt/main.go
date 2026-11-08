package main

import (
	"fmt"
	"os"

	"github.com/zekrotja/yuri/pkg/mgmtcli"
)

func main() {
	if err := mgmtcli.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %s\n", err.Error())
		os.Exit(1)
	}
}
