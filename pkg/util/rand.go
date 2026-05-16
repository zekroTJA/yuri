package util

import "crypto/rand"

const DefaultCharset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func GenerateRandomString(length int, charset string) string {
	src := make([]byte, length)
	rand.Read(src)
	for i := range src {
		src[i] = charset[src[i]%byte(len(charset))]
	}
	return string(src)
}
