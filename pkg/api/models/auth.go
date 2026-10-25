package models

type AuthRequest struct {
	Handle   string `json:"handle" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required"`
}

type AuthDeleteAccountRequest struct {
	Password string `json:"password" binding:"required"`
}

type AuthRegisterResponse struct {
	ID     uint   `json:"id"`
	Handle string `json:"handle"`
}
