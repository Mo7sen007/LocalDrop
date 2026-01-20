package models

import (
	"time"

	"github.com/google/uuid"
)

type Admin struct {
	ID           uuid.UUID `json:"id"`
	Username     string    `json:"name"`
	PasswordHash string    `json:"password"`
	CreatedAt    time.Time `json:"creation_date"`
}
