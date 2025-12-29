package handlers

import (
	"archive/zip"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func DownloadFolderHandler(c *gin.Context) {
	folderIDStr := c.Param("id")
	folderId, err := uuid.Parse(folderIDStr)
	if err != nil {
		c.String(http.StatusBadRequest, "Invalid UUID format")
		return
	}

	folder, err := storage.GetFolder(folderId)
	if err != nil {
		c.String(http.StatusNotFound, "Folder not found")
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.zip\"", folder.Name))
	c.Header("Content-Type", "application/zip")

	zipWriter := zip.NewWriter(c.Writer)
	defer zipWriter.Close()

	// Recursive function to add files/folders to zip
	var addFolderToZip func(f *models.Folder, basePath string) error
	addFolderToZip = func(f *models.Folder, basePath string) error {
		// Add files in this folder
		for _, file := range f.Files {
			// Open file on disk
			srcFile, err := os.Open(file.Path)
			if err != nil {
				log.Printf("Failed to open file %s: %v", file.Path, err)
				continue
			}
			defer srcFile.Close()

			// Create zip entry
			zipPath := filepath.Join(basePath, file.Name)
			zipFile, err := zipWriter.Create(zipPath)
			if err != nil {
				return err
			}

			// Copy content
			if _, err := io.Copy(zipFile, srcFile); err != nil {
				return err
			}
		}

		// Process subfolders
		for _, subFolder := range f.SubFolder {
			// We need to fetch the full subfolder content because GetFolder might not be deep enough
			// But wait, storage.GetFolder only returns direct children.
			// So we need to fetch the full subfolder object here.
			fullSubFolder, err := storage.GetFolder(subFolder.ID)
			if err != nil {
				log.Printf("Failed to fetch subfolder %s: %v", subFolder.Name, err)
				continue
			}

			newBasePath := filepath.Join(basePath, subFolder.Name)
			if err := addFolderToZip(fullSubFolder, newBasePath); err != nil {
				return err
			}
		}
		return nil
	}

	if err := addFolderToZip(folder, ""); err != nil {
		log.Printf("Error creating zip: %v", err)
		// Can't really change status code now as we might have started writing
		return
	}
}

func GetRootFilesAndFoldersHandler(c *gin.Context) {
	rootFiles, err := storage.GetRootFiles()
	if err != nil {
		c.String(http.StatusInternalServerError, fmt.Sprintf("error loading root files:%v", err))
		return
	}

	rootFolders, err := storage.GetRootFolders()
	if err != nil {
		c.String(http.StatusInternalServerError, fmt.Sprintf("error loading root folders:%v", err))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"files":   rootFiles,
		"folders": rootFolders,
	})
}
