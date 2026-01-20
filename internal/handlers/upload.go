package handlers

import (
	"fmt"
	"log"
	"mime/multipart"
	"net/http"
	"path/filepath"

	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/services"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func parseUploadForm(c *gin.Context) (files []*multipart.FileHeader, pinCode string, folderID *uuid.UUID, contentType string, basePath string, err error) {
	form, err := c.MultipartForm()
	if err != nil {
		return nil, "", nil, "", "", fmt.Errorf("multipart form: %w", err)
	}
	files = form.File["files"]
	pinCode = c.PostForm("pinCode")

	folderIdStr := c.PostForm("folderId")
	contentType = c.PostForm("type")

	if pinCode != "" {
		pinCode, err = services.HashPassword(pinCode)
		if err != nil {
			return nil, "", nil, "", "", fmt.Errorf("error parsing pin code: %w", err)
		}
	}

	if folderIdStr != "" {
		parsed, err := uuid.Parse(folderIdStr)
		if err != nil {
			return nil, "", nil, "", "", fmt.Errorf("invalid folder id: %w", err)
		}
		folderID = &parsed
	}

	basePath, err = paths.GetFilesPath()
	if err != nil {
		log.Printf("Could not get default path: %v", err)
		basePath = ""
	}
	return files, pinCode, folderID, contentType, basePath, nil
}

func UploadHandler(c *gin.Context) {
	files, pinCode, folderID, contentType, basePath, err := parseUploadForm(c)
	if err != nil {
		log.Printf("upload parse error: %v", err)
		c.String(http.StatusBadRequest, err.Error())
		return
	}

	switch contentType {
	case "file":
		if len(files) == 0 {
			c.String(http.StatusBadRequest, "No file provided")
			return
		}
		if folderID == nil {
			c.String(http.StatusBadRequest, "folderId is required for type=file")
			return
		}
		if err := handleSingleFile(c, files[0], pinCode, *folderID); err != nil {
			c.String(http.StatusInternalServerError, err.Error())
			return
		}
		c.String(http.StatusOK, "File uploaded successfully!")
	case "files":
		if len(files) == 0 {
			c.String(http.StatusBadRequest, "No files provided")
			return
		}
		if err := handleMultipleFiles(files, pinCode, folderID, basePath); err != nil {
			c.String(http.StatusInternalServerError, err.Error())
			return
		}
		c.String(http.StatusOK, fmt.Sprintf("%d files uploaded successfully!", len(files)))
	case "folder":
		if len(files) == 0 {
			c.String(http.StatusBadRequest, "No files provided")
			return
		}
		form, _ := c.MultipartForm()
		pathsList := form.Value["paths"]
		if err := services.SaveFolder(files, pathsList, folderID, pinCode); err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("Failed to upload folder: %v", err))
			return
		}
		c.String(http.StatusOK, fmt.Sprintf("Folder uploaded successfully with %d files!", len(files)))
	default:
		c.String(http.StatusBadRequest, "Invalid upload type: %s", contentType)
	}
}

func handleSingleFile(c *gin.Context, fh *multipart.FileHeader, pin string, folderID uuid.UUID) error {
	folder, err := storage.GetFolder(folderID)
	if err != nil {
		return fmt.Errorf("folder not found: %w", err)
	}
	uniqueName := fh.Filename + uuid.New().String() + filepath.Ext(fh.Filename)
	diskPath := filepath.Join(folder.Path, uniqueName)
	if err := c.SaveUploadedFile(fh, diskPath); err != nil {
		return fmt.Errorf("save uploaded file: %w", err)
	}
	if err := services.SaveFile(fh.Filename, diskPath, pin, &folder.ID); err != nil {
		return fmt.Errorf("save file meta: %w", err)
	}
	return nil
}

func handleMultipleFiles(files []*multipart.FileHeader, pin string, folderID *uuid.UUID, basePath string) error {

	var targetPath = basePath
	if folderID != nil {
		f, err := storage.GetFolder(*folderID)
		if err == nil {
			targetPath = f.Path
		}
	}
	for _, fh := range files {
		if err := services.SaveFile(fh.Filename, targetPath, pin, folderID); err != nil {
			log.Printf("failed saving %s: %v", fh.Filename, err)
		}
	}
	return nil
}
