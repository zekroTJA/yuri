package cliutil

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

func Confirm(prompt string) (bool, error) {
	fmt.Printf("%s [y/N]: ", prompt)
	answer, err := bufio.NewReader(os.Stdin).ReadString('\n')
	if err != nil && answer == "" {
		return false, err
	}
	answer = strings.ToLower(strings.TrimSpace(answer))
	return answer == "y" || answer == "yes", nil
}
