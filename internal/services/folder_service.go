package services

import (
	"fmt"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func DeleteFolder(folderID uuid.UUID) error {
	folder, err := storage.GetFolder(folderID)
	if err != nil {
		return fmt.Errorf("error loading error:%v", err)
	}
	err = os.RemoveAll(folder.Path)
	if err != nil {
		return err
	}
	return nil

}

func GetFolderContentByID(folderID uuid.UUID) ([]models.File, []models.Folder, error) {
	folder, err := storage.GetFolder(folderID)
	if err != nil {
		return nil, nil, err
	}
	files := folder.Files
	subFolders := folder.SubFolder
	return files, subFolders, nil
}

// SaveFolder saves an entire folder structure with nested files and subfolders
// Parameters:
// - c: Gin context for accessing request data and multipart form
// - files: Array of file headers from the multipart form
// - pathsList: Array of relative paths corresponding to each file
// - parentFolderID: UUID of the parent folder where this structure will be created
// - pinCode: Optional PIN code for file protection
// Returns error if folder creation, file save, or database operations fail
func SaveFolder(c *gin.Context, files []*multipart.FileHeader, pathsList []string, parentFolderID *uuid.UUID, pinCode string) error {
	// Determine the base path for saving files
	var basePath string

	if parentFolderID != nil {
		// Look up the parent folder to get its path
		parentFolder, err := storage.GetFolder(*parentFolderID)
		if err != nil {
			log.Printf("Parent folder with ID %s not found: %v", parentFolderID.String(), err)
			return fmt.Errorf("parent folder not found: %w", err)
		}
		// Use the parent folder's path as the base
		basePath = parentFolder.Path
	} else {
		// No parent folder specified, use the default files directory
		defaultPath, err := paths.GetFilesPath()
		if err != nil {
			return fmt.Errorf("could not get base path: %w", err)
		}
		basePath = defaultPath
	}

	// Track the current parent ID as we traverse the folder structure
	currentParentID := parentFolderID

	// Iterate through each file and its corresponding path
	for i, fileHeader := range files {
		// Determine the relative path for this file
		relPath := fileHeader.Filename
		if i < len(pathsList) && pathsList[i] != "" {
			relPath = pathsList[i]
		}

		// Split the path into components (e.g., "folder/sub/file.txt" -> ["folder", "sub", "file.txt"])
		parts := strings.Split(filepath.ToSlash(relPath), "/")
		currentParentID = parentFolderID

		// If there are folders in the path, create/find them in the database
		if len(parts) > 1 {
			for _, folderName := range parts[:len(parts)-1] {
				// Check if folder already exists under current parent
				existingFolder, err := storage.GetFolderByNameAndParent(folderName, currentParentID)
				if err == nil && existingFolder != nil {
					// Folder exists, use its ID as the parent for the next level
					currentParentID = &existingFolder.ID
				} else {
					// Folder doesn't exist, create it
					newFolderID := uuid.New()

					// Build the physical path for this folder
					var folderPath string
					if currentParentID != nil {
						// Get the current parent's path
						currentParent, err := storage.GetFolder(*currentParentID)
						if err != nil {
							log.Printf("Failed to get parent folder: %v", err)
							continue
						}
						folderPath = filepath.Join(currentParent.Path, folderName)
					} else {
						folderPath = filepath.Join(basePath, folderName)
					}

					// Create the physical directory on disk
					if err := os.MkdirAll(folderPath, os.ModePerm); err != nil {
						log.Printf("Failed to create directory %s: %v", folderPath, err)
						continue
					}

					// Create folder record in database
					newFolder := models.Folder{
						ID:        newFolderID,
						Name:      folderName,
						Path:      folderPath,
						ParentID:  currentParentID,
						CreatedAt: time.Now(),
						PinCode:   nil, // Folders inherit access control
					}
					if err := storage.CreateFolder(&newFolder); err != nil {
						log.Printf("Failed to create folder record %s: %v", folderName, err)
						continue
					}

					// Update current parent to the newly created folder
					currentParentID = &newFolderID
				}
			}
		}

		// Now save the file using the SaveFile function
		// The file will be saved under the currentParentID (which is the deepest folder in the path)
		if err := SaveFile(fileHeader.Filename, basePath, pinCode, currentParentID); err != nil {
			log.Printf("Failed to save file %s: %v", fileHeader.Filename, err)
			// Continue with other files even if one fails
			continue
		}
	}

	log.Printf("Successfully uploaded folder structure with %d files", len(files))
	return nil
}
