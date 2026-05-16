package database

import "errors"

var (
	ErrNotFound        = errors.New("not found")
	ErrInviteExpired   = errors.New("invite expired")
	ErrInviteExhausted = errors.New("invite has no remaining activations")
)
