package util

import "crypto/rand"

const DefaultCharset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

// GenerateRandomString returns a cryptographically secure random string of
// the given length consisting of characters of the given charset. The charset
// must contain between 1 and 256 characters.
func GenerateRandomString(length int, charset string) string {
	// Random bytes at or above maxUnbiased are discarded, because mapping
	// them via modulo would make the first characters of the charset more
	// likely than the others.
	maxUnbiased := 256 - (256 % len(charset))

	res := make([]byte, 0, length)
	src := make([]byte, length)
	for len(res) < length {
		// err in rand.Read is unreachable and would result in a panic, so
		// this is totally fine to ignore the returned error here.
		_, _ = rand.Read(src)
		for _, b := range src {
			if int(b) >= maxUnbiased {
				continue
			}
			res = append(res, charset[int(b)%len(charset)])
			if len(res) == length {
				break
			}
		}
	}
	return string(res)
}
