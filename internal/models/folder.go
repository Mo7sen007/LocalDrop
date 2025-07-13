package models

import (
	"time"

	"github.com/google/uuid"
)

type Folder struct {
	ID        uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id" form:"id"`
	Name      string     `gorm:"not null" json:"name" form:"name"`
	PinCode   *string    `json:"pin_code,omitempty" form:"pin_code"` // nullable
	CreatedAt time.Time  `gorm:"not null;default:now()" json:"created_at" form:"created_at"`
	Size      int64      `gorm:"not null" json:"size" form:"size"`
	SessionID uuid.UUID  `gorm:"not null" json:"session_id" form:"session_id"`
	ParentID  *uuid.UUID `json:"parent_id,omitempty" form:"parent_id"`              // nullable
	SubFolder []Folder   `gorm:"foreignKey:ParentID" json:"folders" form:"folders"` // fixed!
	Files     []File     `gorm:"foreignKey:FolderID" json:"files" form:"files"`
}
