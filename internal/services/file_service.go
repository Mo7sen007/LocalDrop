package services

import (
	"fmt"
	"io"
	"log"
	"mime"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/storage"

	"github.com/google/uuid"
)

func GetAllFiles() []models.File {
	files, err := storage.GetAllFiles()
	if err != nil {
		return []models.File{}
	}
	return files
}

func GetFileByID(id uuid.UUID) (*models.File, bool) {
	file, err := storage.GetFile(id)
	if err != nil {
		return nil, false
	}
	return file, true
}

func HasPinCode(file *models.File) bool {
	return file.Pin != nil && *file.Pin != ""
}

func DeleteFiles(files []models.File) error {
	for _, file := range files {
		err := os.Remove(file.Path)
		if err != nil {
			return err
		}
	}
	return nil
}

// SaveFile saves a single uploaded file to disk and database
// Parameters:
// - c: Gin context for accessing request data and saving uploaded files
// - fileHeader: The uploaded file header containing file metadata
// - folderID: UUID of the parent folder (can be root folder UUID or another folder)
// - pinCode: Optional PIN code for file protection
// Returns error if folder lookup, file save, or database insert fails

func SaveFile(filename string, diskPath string, pinCode string, folderID *uuid.UUID) error {

	info, err := os.Stat(diskPath)
	if err != nil {
		// If we can't stat the file, clean up and return error
		os.Remove(diskPath)
		return fmt.Errorf("could not stat saved file: %w", err)
	}
	extension := filepath.Ext(filename)
	var pinPtr *string
	if pinCode != "" {
		pinPtr = &pinCode
	}

	uploadedFile := models.File{
		ID:        uuid.New(),                      // Generate new UUID for this file
		FolderID:  folderID,                        // Parent folder (nil if root level)
		Name:      filename,                        // Original filename from upload
		Path:      diskPath,                        // Physical path on disk
		Pin:       pinPtr,                          // PIN code for access control (nil if none)
		Size:      info.Size(),                     // File size in bytes
		Extension: extension,                       // File extension (e.g., ".txt")
		MIMEType:  mime.TypeByExtension(extension), // MIME type derived from extension
		ModTime:   time.Now(),                      // Last modification time
		CreatedAt: time.Now(),                      // Creation timestamp
	}
	if err := storage.CreateFile(&uploadedFile); err != nil {
		// If database insert fails, clean up the physical file
		os.Remove(diskPath)
		log.Printf("Failed to save file metadata to database: %v", err)
		return fmt.Errorf("could not save file to database: %w", err)
	}

	// Log successful upload
	log.Printf("Successfully uploaded file: %s (ID: %s, Size: %d bytes)",
		filename, uploadedFile.ID.String(), uploadedFile.Size)

	return nil

}

func SaveUploadedFile(file *multipart.FileHeader, path string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()
	tempFile, err := os.CreateTemp(filepath.Dir(path), ".upload-*")
	if err != nil {
		return err
	}

	tempName := tempFile.Name()
	defer tempFile.Close()

	_, err = io.Copy(tempFile, src)
	if err != nil {
		os.Remove(tempName)
		return err
	}
	tempFile.Close()

	if err := os.Rename(tempName, path); err != nil {
		return err
	}
	return os.Chmod(path, 0644)
}
