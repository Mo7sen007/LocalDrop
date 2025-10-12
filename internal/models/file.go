package models

import (
	"fmt"
	"mime"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/google/uuid"
)

type File struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	Size      int64     `json:"size"`
	Pin       string    `json:"pin"`
	Extension string    `json:"extension"`
	MIMEType  string    `json:"mime_type"`
	ModTime   time.Time `json:"mod_time"`
}

func GetInitialListOfFiles(list map[uuid.UUID]File) error {
	filesPath, err := paths.GetFilesPath()
	if err != nil {
		return fmt.Errorf("failed to get files path: %v", err)
	}

	filesDir := filepath.Clean(filesPath)

	files, err := os.ReadDir(filesDir)
	if err != nil {
		return fmt.Errorf("error reading directory: %v", err)
	}

	for _, entry := range files {
		if entry.IsDir() {
			continue
		}

		fullPath := filepath.Join(filesDir, entry.Name())
		info, err := os.Stat(fullPath)
		if err != nil {
			fmt.Printf("error getting file metadata: %v\n", err)
			continue
		}

		ext := filepath.Ext(entry.Name())
		mimeType := mime.TypeByExtension(ext)
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}

		newFile := File{
			ID:        uuid.New(),
			Name:      entry.Name(),
			Path:      fullPath,
			Size:      info.Size(),
			ModTime:   info.ModTime(),
			Pin:       "",
			Extension: ext,
			MIMEType:  mimeType,
		}
		list[newFile.ID] = newFile
		fmt.Printf("added %s\n", newFile.Name)
	}
	return nil
}
func GetExtension(fileName string) string {
	dot := strings.LastIndex(fileName, ".")
	if dot == -1 {
		return ""
	}
	return fileName[dot+1:]
}
