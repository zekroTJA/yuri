package models

type AuthRequest struct {
	Handle   string `json:"handle" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthRegisterResponse struct {
	ID     uint   `json:"id"`
	Handle string `json:"handle"`
}
