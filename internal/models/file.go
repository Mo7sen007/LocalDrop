package models

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

type File struct {
	ID        uuid.UUID  `json:"id"`
	FolderID  *uuid.UUID `json:"folder_id,omitempty"`
	Name      string     `json:"name"`
	Path      string     `json:"path"`
	Size      int64      `json:"size"`
	Pin       string     `json:"pin"`
	Extension string     `json:"extension"`
	MIMEType  string     `json:"mime_type"`
	ModTime   time.Time  `json:"mod_time"`
	CreatedAt time.Time  `json:"created_at"`
}

func GetExtension(fileName string) string {
	dot := strings.LastIndex(fileName, ".")
	if dot == -1 {
		return ""
	}
	return fileName[dot+1:]
}
