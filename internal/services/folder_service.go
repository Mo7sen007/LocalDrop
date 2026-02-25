package services

import (
	"archive/zip"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/services/serverlog"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type fileService interface {
	SaveUploadedFile(fileHeader *multipart.FileHeader, destPath string) error
	SaveFile(name, path, pin string, parentID *uuid.UUID) error
}
type FolderService struct {
	repo        storage.FolderRepository
	fileService fileService
	fileRepo    storage.FileRepository
}

func NewFolderService(repo storage.FolderRepository, fileRepo storage.FileRepository, fileService fileService) *FolderService {
	return &FolderService{repo: repo, fileRepo: fileRepo, fileService: fileService}
}

func (s *FolderService) DeleteFolder(folderID uuid.UUID) error {
	folder, err := s.repo.GetFolderByID(folderID)
	if err != nil {
		return fmt.Errorf("error loading error:%v", err)
	}
	err = os.RemoveAll(folder.Path)
	if err != nil {
		return err
	}
	err = s.repo.DeleteFolder(folderID.String())
	if err != nil {
		return fmt.Errorf("error deleting folder from repository: %v", err)
	}
	return nil

}

func (s *FolderService) GetFolderContentByID(folderID uuid.UUID) ([]models.File, []models.Folder, error) {
	folder, err := s.repo.GetFolderByID(folderID)
	if err != nil {
		return nil, nil, err
	}
	files := folder.Files
	subFolders := folder.SubFolder
	return files, subFolders, nil
}

func (s *FolderService) resolveRootFolderName(files []*multipart.FileHeader, pathsList []string, displayName string, parentFolderID *uuid.UUID) string {
	baseName := strings.TrimSpace(displayName)
	if baseName == "" {
		if len(files) == 0 {
			return ""
		}
		relPath := files[0].Filename
		if len(pathsList) > 0 && pathsList[0] != "" {
			relPath = pathsList[0]
		}
		parts := strings.Split(filepath.ToSlash(relPath), "/")
		if len(parts) > 1 {
			baseName = parts[0]
		}
	}

	if baseName == "" {
		return ""
	}

	name := baseName
	if existing, err := s.repo.GetFolderByNameAndParent(name, parentFolderID); err == nil && existing != nil {
		for i := 1; ; i++ {
			candidate := fmt.Sprintf("%s (%d)", baseName, i)
			if existing, err := s.repo.GetFolderByNameAndParent(candidate, parentFolderID); err != nil || existing == nil {
				name = candidate
				break
			}
		}
	}

	return name
}

// SaveFolder saves an entire folder structure with nested files and subfolders
// Parameters:
// - c: Gin context for accessing request data and multipart form
// - files: Array of file headers from the multipart form
// - pathsList: Array of relative paths corresponding to each file
// - parentFolderID: UUID of the parent folder where this structure will be created
// - pinCode: Optional PIN code for file protection
// Returns error if folder creation, file save, or database operations fail
func (s *FolderService) SaveFolder(files []*multipart.FileHeader, pathsList []string, parentFolderID *uuid.UUID, pinCode string, displayName string) error {
	// Determine the base path for saving files
	var basePath string

	if parentFolderID != nil {
		// Look up the parent folder to get its path
		parentFolder, err := s.repo.GetFolderByID(*parentFolderID)
		if err != nil {
			serverlog.Warnf("Parent folder with ID %s not found: %v", parentFolderID.String(), err)
			return fmt.Errorf("parent folder not found: %w", err)
		}
		// Use the parent folder's path as the base
		basePath = parentFolder.Path
	} else {
		// No parent folder specified, use the Root folder path
		rootFolder, err := s.repo.GetRoot()
		if err != nil {
			return fmt.Errorf("could not get root folder: %w", err)
		}
		basePath = rootFolder.Path
	}

	// Track the current parent ID as we traverse the folder structure
	currentParentID := parentFolderID

	rootNameOverride := s.resolveRootFolderName(files, pathsList, displayName, parentFolderID)

	// Iterate through each file and its corresponding path

	for i, fileHeader := range files {
		// Determine the relative path for this file
		relPath := fileHeader.Filename

		if i < len(pathsList) && pathsList[i] != "" {
			relPath = pathsList[i]
		}

		// Split the path into components (e.g., "folder/sub/file.txt" -> ["folder", "sub", "file.txt"])
		parts := strings.Split(filepath.ToSlash(relPath), "/")
		if rootNameOverride != "" {
			if len(parts) > 1 {
				parts[0] = rootNameOverride
			} else if len(parts) == 1 {
				parts = []string{rootNameOverride, parts[0]}
			}
			relPath = filepath.ToSlash(filepath.Join(parts...))
		}
		currentParentID = parentFolderID

		// If there are folders in the path, create/find them in the database
		if len(parts) > 1 {
			for _, folderName := range parts[:len(parts)-1] {
				// Check if folder already exists under current parent
				existingFolder, err := s.repo.GetFolderByNameAndParent(folderName, currentParentID)
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
						currentParent, err := s.repo.GetFolderByID(*currentParentID)
						if err != nil {
							serverlog.Errorf("Failed to get parent folder: %v", err)
							continue
						}
						folderPath = filepath.Join(currentParent.Path, folderName)
					} else {
						folderPath = filepath.Join(basePath, folderName)
					}

					// Create the physical directory on disk
					if err := os.MkdirAll(folderPath, os.ModePerm); err != nil {
						serverlog.Errorf("Failed to create directory %s: %v", folderPath, err)
						continue
					}

					// Create folder record in database
					var folderPin *string
					if pinCode != "" {
						folderPin = &pinCode
					}
					newFolder := models.Folder{
						ID:        newFolderID,
						Name:      folderName,
						Path:      folderPath,
						ParentID:  currentParentID,
						CreatedAt: time.Now(),
						PinCode:   folderPin,
					}
					if err := s.repo.CreateFolder(&newFolder); err != nil {
						serverlog.Errorf("Failed to create folder record %s: %v", folderName, err)
						continue
					}

					// Update current parent to the newly created folder
					currentParentID = &newFolderID
				}
			}
		}

		// Now save the file using the SaveFile function
		// The file will be saved under the currentParentID (which is the deepest folder in the path)
		finalPath := filepath.Join(basePath, relPath)

		err := s.fileService.SaveUploadedFile(fileHeader, finalPath)
		if err != nil {
			return err
		}
		if err := s.fileService.SaveFile(fileHeader.Filename, finalPath, pinCode, currentParentID); err != nil {
			serverlog.Errorf("Failed to save file %s: %v", fileHeader.Filename, err)
			// Continue with other files even if one fails
			continue
		}
	}

	serverlog.Infof("Successfully uploaded folder structure with %d files", len(files))
	return nil
}

func (s *FolderService) GetRootFolder() (*models.Folder, error) {
	folder, err := s.repo.GetRoot()
	if err != nil {
		return nil, fmt.Errorf("error fetching folder: %w", err)
	}
	return folder, nil
}

func (s *FolderService) GetFolderByID(folderID uuid.UUID) (*models.Folder, error) {
	folder, err := s.repo.GetFolderByID(folderID)
	if err != nil {
		return nil, fmt.Errorf("error fetching folder: %w", err)
	}
	return folder, nil
}

func (s *FolderService) CreateFolderZip(folder *models.Folder, basePath string, responseWriter gin.ResponseWriter) error {

	zipWriter := zip.NewWriter(responseWriter)
	defer zipWriter.Close()

	for _, file := range folder.Files {

		srcFile, err := os.Open(file.Path)
		if err != nil {
			serverlog.Errorf("Failed to open file %s: %v", file.Path, err)
			continue
		}
		defer srcFile.Close()

		zipPath := filepath.Join(basePath, file.Name)
		zipFile, err := zipWriter.Create(zipPath)
		if err != nil {
			return err
		}

		if _, err := io.Copy(zipFile, srcFile); err != nil {
			return err
		}
	}

	for _, subFolder := range folder.SubFolder {
		fullSubFolder, err := s.repo.GetFolderByID(subFolder.ID)
		if err != nil {
			serverlog.Errorf("Failed to fetch subfolder %s: %v", subFolder.Name, err)
			continue
		}

		newBasePath := filepath.Join(basePath, subFolder.Name)
		if err := s.CreateFolderZip(fullSubFolder, newBasePath, responseWriter); err != nil {
			return err
		}
	}
	return nil
}
