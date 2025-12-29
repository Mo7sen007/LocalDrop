package handlers

import (
	"fmt"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/services"
	"github.com/Mo7sen007/LocalDrop/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func DownloadFileHandler(c *gin.Context) {
	fileIdStr := c.Param("id")
	pinCode := c.Query("pin")
	fileId, err := uuid.Parse(fileIdStr)
	if err != nil {
		log.Printf("invalid UUID format:%v", err)
		c.String(http.StatusBadRequest, "Invalid UUID format")
		return
	}

	file, found := services.GetFileByID(fileId)
	if !found {
		log.Printf("File not found")
		c.String(http.StatusNotFound, "File not found")
		return
	}
	if pinCode == file.Pin {
		log.Printf("Sent %s with size of %d", file.Name, file.Size)
		c.FileAttachment(file.Path, file.Name)
		return
	} else {
		c.String(http.StatusBadRequest, "pin code is incorrect")
		return
	}
}

func UploadFileHandler(c *gin.Context) {
	// Parse multipart form (max 32MB memory)
	form, err := c.MultipartForm()

	if err != nil {
		log.Printf("File upload error: %v", err)
		c.String(http.StatusBadRequest, "File upload error: %v", err)
		return
	}

	files := form.File["files"]
	pathsList := form.Value["paths"] // Relative paths sent by frontend
	pinCode := c.PostForm("pinCode")
	folderIdStr := c.PostForm("folderId")

	var rootParentID *uuid.UUID
	if folderIdStr != "" {
		parsedID, err := uuid.Parse(folderIdStr)
		if err == nil {
			rootParentID = &parsedID
		}
	}

	basePath, err := paths.GetFilesPath()
	if err != nil {
		c.String(http.StatusInternalServerError, "Could not find base directory: %v", err)
		return
	}

	for i, fileHeader := range files {
		// Determine relative path (default to filename if no path provided)
		relPath := fileHeader.Filename
		if i < len(pathsList) && pathsList[i] != "" {
			relPath = pathsList[i]
		}

		// 1. Handle Folder Structure in DB
		// Split path into components (e.g., "folder/sub/file.txt" -> ["folder", "sub", "file.txt"])
		parts := strings.Split(filepath.ToSlash(relPath), "/")
		currentParentID := rootParentID

		// If there are folders in the path, create/find them
		if len(parts) > 1 {
			for _, folderName := range parts[:len(parts)-1] {
				// Check if folder exists under current parent
				existingFolder, err := storage.GetFolderByNameAndParent(folderName, currentParentID)
				if err == nil && existingFolder != nil {
					currentParentID = &existingFolder.ID
				} else {
					// Create new folder
					newFolderID := uuid.New()
					newFolder := models.Folder{
						ID:        newFolderID,
						Name:      folderName,
						ParentID:  currentParentID,
						CreatedAt: time.Now(),
						PinCode:   nil, // Folders inherit access, or set specific pin if needed
					}
					if err := storage.CreateFolder(&newFolder); err != nil {
						log.Printf("Failed to create folder %s: %v", folderName, err)
						continue
					}
					currentParentID = &newFolderID
				}
			}
		}

		// 2. Save File to Disk
		// We flatten the storage on disk to avoid OS path limit issues, or you can mirror structure.
		// Here we just use a unique name to avoid collisions.
		uniqueName := uuid.New().String() + filepath.Ext(fileHeader.Filename)
		diskPath := filepath.Join(basePath, uniqueName)

		if err := c.SaveUploadedFile(fileHeader, diskPath); err != nil {
			log.Printf("Could not save file %s: %v", fileHeader.Filename, err)
			continue
		}

		// 3. Save File Metadata to DB
		info, _ := os.Stat(diskPath)
		ext := filepath.Ext(fileHeader.Filename)

		uploadedFile := models.File{
			ID:        uuid.New(),
			FolderID:  currentParentID,
			Name:      parts[len(parts)-1], // Original name
			Path:      diskPath,            // Physical path
			Pin:       pinCode,
			Size:      info.Size(),
			Extension: ext,
			MIMEType:  mime.TypeByExtension(ext),
			ModTime:   time.Now(),
			CreatedAt: time.Now(),
		}

		if err := storage.CreateFile(&uploadedFile); err != nil {
			log.Printf("Failed to save file db record: %v", err)
		}
	}

	c.String(http.StatusOK, fmt.Sprintf("%d files uploaded!", len(files)))
}

func DeleteFileHandler(c *gin.Context) {
	fileIdStr := c.Param("id")
	fileId, err := uuid.Parse(fileIdStr)
	if err != nil {
		log.Printf("Invalid UUID format:%v", err)
		c.String(http.StatusBadRequest, "Invalid UUID format")
		return
	}
	file, found := services.GetFileByID(fileId)
	if !found {
		log.Printf("File not found")
		c.String(http.StatusNotFound, "File not found")
		return
	}
	err = os.Remove(file.Path)
	if err != nil {
		log.Printf("Error deleting file:%v", err)
		c.String(http.StatusInternalServerError, "Error deleting file")
		return
	}

	err = storage.DeleteFile(fileId)
	if err != nil {
		log.Printf("Error deleting file from db:%v", err)
		c.String(http.StatusInternalServerError, "Error deleting file from db")
		return
	}

	log.Printf("Deleted file with ID:%s ", fileIdStr)
	c.String(http.StatusOK, fmt.Sprintf("File '%s' deleted successfully", file.Name))
}

func HasPinHandler(c *gin.Context) {
	fileIdStr := c.Param("id")
	fileId, err := uuid.Parse(fileIdStr)
	if err != nil {
		log.Printf("Invalid UUID format :%v", err)
		c.String(http.StatusBadRequest, "Invalid UUID format")
		return
	}
	file, found := services.GetFileByID(fileId)

	if !found {
		log.Printf("File  is not present")
		c.String(http.StatusNotFound, "File is not present")
		return
	}

	hasPin := services.HasPinCode(file)
	c.JSON(http.StatusOK, gin.H{
		"hasPIN": hasPin,
	})
}

func GetAllFilesHandler(c *gin.Context) {
	files := services.GetAllFiles()
	c.JSON(http.StatusOK, gin.H{
		"files": files,
	})
}
