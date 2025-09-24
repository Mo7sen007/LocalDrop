package models

import (
	"fmt"
	"os"
	"strings"
	"time"

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
	files, err := os.ReadDir("./files")
	if err != nil {
		return fmt.Errorf("error reading directory: %v", err)
	}
	for _, entry := range files {
		if entry.IsDir() {
			continue
		}

		fullPath := "./files/" + entry.Name()
		info, err := os.Stat(fullPath)
		if err != nil {
			fmt.Printf("error getting file metadata: %v\n", err)
			continue
		}

		newFile := File{
			ID:        uuid.New(),
			Name:      entry.Name(),
			Path:      fullPath,
			Size:      info.Size(),
			ModTime:   info.ModTime(),
			Pin:       "",
			Extension: GetExtension(entry.Name()),
			MIMEType:  "application/octet-stream",
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
