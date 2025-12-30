package services

import (
	"fmt"
	"log"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetInitialListOfFiles(c *gin.Context) {
	list, err := storage.GetAllFiles()
	if err != nil {
		c.String(http.StatusInternalServerError, fmt.Sprintf("error loading files:%v", err))
		return
	}

	c.JSON(http.StatusOK, list)
}

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
func SaveFile(c *gin.Context, fileHeader *multipart.FileHeader, folderID *uuid.UUID, pinCode string) error {
	var basePath string

	// Verify that the folder exists if a folderID is provided
	if folderID != nil {
		// Look up the folder in the database to ensure it exists
		folder, err := storage.GetFolder(*folderID)
		if err != nil {
			// Log and return error if folder is not found
			log.Printf("Folder with ID %s not found: %v", folderID.String(), err)
			return fmt.Errorf("folder not found: %w", err)
		}
		// Use the folder's path as the base path
		basePath = folder.Path
	} else {
		// No folder specified, use the default files directory
		defaultPath, err := paths.GetFilesPath()
		if err != nil {
			// Return error if we can't determine the storage location
			return fmt.Errorf("could not get base path: %w", err)
		}
		basePath = defaultPath
	}

	// Generate a unique filename to avoid collisions on disk
	// Format: <uuid>.<original-extension>
	uniqueName := uuid.New().String() + filepath.Ext(fileHeader.Filename)

	// Build the full disk path where the file will be saved
	diskPath := filepath.Join(basePath, uniqueName)

	// Save the uploaded file to disk using Gin's helper function
	if err := c.SaveUploadedFile(fileHeader, diskPath); err != nil {
		// Log and return error if file save fails
		log.Printf("Failed to save file %s to disk: %v", fileHeader.Filename, err)
		return fmt.Errorf("could not save file to disk: %w", err)
	}

	// Get file stats from the saved file (size, timestamps, etc.)
	info, err := os.Stat(diskPath)
	if err != nil {
		// If we can't stat the file, clean up and return error
		os.Remove(diskPath)
		return fmt.Errorf("could not stat saved file: %w", err)
	}

	// Extract file extension for metadata
	ext := filepath.Ext(fileHeader.Filename)

	// Convert pinCode string to *string (nil if empty)
	var pinPtr *string
	if pinCode != "" {
		pinPtr = &pinCode
	}

	// Create the file model object with all metadata
	uploadedFile := models.File{
		ID:        uuid.New(),                // Generate new UUID for this file
		FolderID:  folderID,                  // Parent folder (nil if root level)
		Name:      fileHeader.Filename,       // Original filename from upload
		Path:      diskPath,                  // Physical path on disk
		Pin:       pinPtr,                    // PIN code for access control (nil if none)
		Size:      info.Size(),               // File size in bytes
		Extension: ext,                       // File extension (e.g., ".txt")
		MIMEType:  mime.TypeByExtension(ext), // MIME type derived from extension
		ModTime:   time.Now(),                // Last modification time
		CreatedAt: time.Now(),                // Creation timestamp
	}

	// Save file metadata to the database
	if err := storage.CreateFile(&uploadedFile); err != nil {
		// If database insert fails, clean up the physical file
		os.Remove(diskPath)
		log.Printf("Failed to save file metadata to database: %v", err)
		return fmt.Errorf("could not save file to database: %w", err)
	}

	// Log successful upload
	log.Printf("Successfully uploaded file: %s (ID: %s, Size: %d bytes)",
		fileHeader.Filename, uploadedFile.ID.String(), uploadedFile.Size)

	return nil
}
