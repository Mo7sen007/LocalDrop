package models

import (
	"time"

	"github.com/google/uuid"
)

type Folder struct {
	ID        uuid.UUID `json:"id" form:"id"`
	Name      string    `json:"name" form:"name"`
	Path      string
	PinCode   *string    `json:"pin_code,omitempty" form:"pin_code"`
	CreatedAt time.Time  `json:"created_at" form:"created_at"`
	Size      int64      `json:"size" form:"size"`
	ParentID  *uuid.UUID `json:"parent_id,omitempty" form:"parent_id"`
	SubFolder []Folder   `json:"folders" form:"folders"`
	Files     []File     `json:"files" form:"files"`
}
