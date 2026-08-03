package models

type AuthRequest struct {
	Handle   string `json:"handle" binding:"required"`
	Password string `json:"password" binding:"required"`
}
