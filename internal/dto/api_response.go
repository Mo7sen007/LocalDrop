package dto

import (
	"time"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/google/uuid"
)

type FolderContentResponse struct {
	Files       []File   `json:"files"`
	Folders     []Folder `json:"folders"`
	IsProtected bool     `json:"isProtected"`
}

type File struct {
	ID          uuid.UUID  `json:"id"`
	FolderID    *uuid.UUID `json:"folder_id,omitempty"`
	Name        string     `json:"name"`
	Size        int64      `json:"size"`
	IsProtected bool       `json:"isProtected"`
	Extension   string     `json:"extension"`
	MIMEType    string     `json:"mime_type"`
	CreatedAt   time.Time  `json:"created_at"`
}

type Folder struct {
	ID          uuid.UUID  `json:"id" form:"id"`
	Name        string     `json:"name" form:"name"`
	IsProtected bool       `json:"isProtected"`
	CreatedAt   time.Time  `json:"created_at" form:"created_at"`
	Size        int64      `json:"size" form:"size"`
	ParentID    *uuid.UUID `json:"parent_id,omitempty" form:"parent_id"`
	SubFolder   []Folder   `json:"folders" form:"folders"`
	Files       []File     `json:"files" form:"files"`
}

func CreateFile(file models.File) File {
	return File{
		ID:          file.ID,
		Name:        file.Name,
		IsProtected: file.Pin != nil && *file.Pin != "",
		CreatedAt:   file.CreatedAt,
		Size:        file.Size,
		FolderID:    file.FolderID,
		MIMEType:    file.MIMEType,
		Extension:   file.Extension,
	}
}

func CreateFolder(folder models.Folder) Folder {
	return Folder{
		ID:          folder.ID,
		Name:        folder.Name,
		IsProtected: folder.PinCode != nil && *folder.PinCode != "",
		CreatedAt:   folder.CreatedAt,
		Size:        folder.Size,
	}
}

func CreateResponseBody(folder models.Folder) FolderContentResponse {
	var ResponseBody FolderContentResponse

	for _, file := range folder.Files {
		ResponseBody.Files = append(ResponseBody.Files, CreateFile(file))
	}
	for _, folder := range folder.SubFolder {
		ResponseBody.Folders = append(ResponseBody.Folders, CreateFolder(folder))
	}

	ResponseBody.IsProtected = folder.PinCode != nil && *folder.PinCode != ""

	return ResponseBody
}
