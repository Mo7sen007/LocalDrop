package handlers

import (
	"fmt"
	"log"
	"net/http"
	"os"

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

	// Check if file has PIN protection
	if file.Pin != nil && *file.Pin != "" {
		// File is protected, verify PIN
		if pinCode == "" {
			c.String(http.StatusUnauthorized, "PIN code required")
			return
		}
		if pinCode != *file.Pin {
			c.String(http.StatusUnauthorized, "Incorrect PIN code")
			return
		}
	}

	// PIN is correct or file is not protected - allow download
	log.Printf("Sent %s with size of %d", file.Name, file.Size)
	c.FileAttachment(file.Path, file.Name)
}

func UploadFileHandler(c *gin.Context) {
	// Parse multipart form (max 32MB memory)
	form, err := c.MultipartForm()
	if err != nil {
		log.Printf("File upload error: %v", err)
		c.String(http.StatusBadRequest, "File upload error: %v", err)
		return
	}

	// Extract form data
	files := form.File["files"]           // Array of uploaded files
	pinCode := c.PostForm("pinCode")      // Optional PIN code for protection
	folderIdStr := c.PostForm("folderId") // Parent folder ID (can be root UUID)
	contentType := c.PostForm("type")     // Upload type: "file", "files", or "folder"

	// Parse folder ID if provided (including root folder UUID)
	var folderID *uuid.UUID
	if folderIdStr != "" {
		parsedID, err := uuid.Parse(folderIdStr)
		if err != nil {
			c.String(http.StatusBadRequest, "Invalid folder ID: %v", err)
			return
		}
		folderID = &parsedID
	}

	// Route to appropriate handler based on content type
	switch contentType {
	case "file":
		// Single file upload
		if len(files) == 0 {
			c.String(http.StatusBadRequest, "No file provided")
			return
		}

		// Save the single file using the new SaveFile function
		if err := services.SaveFile(c, files[0], folderID, pinCode); err != nil {
			c.String(http.StatusInternalServerError, "Failed to upload file: %v", err)
			return
		}

		c.String(http.StatusOK, "File uploaded successfully!")

	case "files":
		// Multiple files upload - save multiple files without folder structure
		if len(files) == 0 {
			c.String(http.StatusBadRequest, "No files provided")
			return
		}

		// Save each file individually to the same folder
		for _, fileHeader := range files {
			if err := services.SaveFile(c, fileHeader, folderID, pinCode); err != nil {
				log.Printf("Failed to upload file %s: %v", fileHeader.Filename, err)
				// Continue with other files even if one fails
			}
		}

		c.String(http.StatusOK, fmt.Sprintf("%d files uploaded successfully!", len(files)))

	case "folder":
		// Folder upload with nested structure
		if len(files) == 0 {
			c.String(http.StatusBadRequest, "No files provided")
			return
		}

		// Get the paths array from the form
		pathsList := form.Value["paths"]

		// Save the folder structure using SaveFolder function
		if err := services.SaveFolder(c, files, pathsList, folderID, pinCode); err != nil {
			c.String(http.StatusInternalServerError, "Failed to upload folder: %v", err)
			return
		}

		c.String(http.StatusOK, fmt.Sprintf("Folder uploaded successfully with %d files!", len(files)))

	default:
		c.String(http.StatusBadRequest, "Invalid upload type: %s", contentType)
	}
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
