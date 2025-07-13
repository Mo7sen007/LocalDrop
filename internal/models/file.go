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

func GetInitialListOfFiles(list *[]File) error {
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
			fmt.Printf("error getting file info: %v\n", err)
			continue
		}

		uploadedFile := File{
			ID:        uuid.New(),
			Name:      entry.Name(),
			Path:      fullPath,
			Size:      info.Size(),
			ModTime:   info.ModTime(),
			Pin:       "",
			Extension: getExtension(entry.Name()),
			MIMEType:  "application/octet-stream",
		}

		*list = append(*list, uploadedFile)
		fmt.Printf("added %s\n", uploadedFile.Name)
	}
	return nil
}

func getExtension(fileName string) string {
	dot := strings.LastIndex(fileName, ".")
	if dot == -1 {
		return ""
	}
	return fileName[dot+1:]
}

func GtFileById(id uuid.UUID, listOfFiles *[]File) (File, bool) {
	for _, file := range *listOfFiles {
		if file.ID == id {
			return file, true
		}
	}
	return File{}, false
}
