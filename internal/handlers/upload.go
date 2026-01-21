package handlers

import (
	"fmt"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/services"
	"github.com/Mo7sen007/LocalDrop/internal/services/serverlog"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func parseUploadForm(c *gin.Context) (files []*multipart.FileHeader, pinCode string, folderID *uuid.UUID, contentType string, basePath string, displayName string, err error) {
	form, err := c.MultipartForm()
	if err != nil {
		return nil, "", nil, "", "", "", fmt.Errorf("multipart form: %w", err)
	}
	files = form.File["files"]
	pinCode = c.PostForm("pinCode")
	displayName = strings.TrimSpace(c.PostForm("fileName"))

	folderIdStr := c.PostForm("folderId")
	contentType = c.PostForm("type")

	if pinCode != "" {
		pinCode, err = services.HashPassword(pinCode)
		if err != nil {
			return nil, "", nil, "", "", "", fmt.Errorf("error parsing pin code: %w", err)
		}
	}

	if folderIdStr != "" {
		parsed, err := uuid.Parse(folderIdStr)
		if err != nil {
			return nil, "", nil, "", "", "", fmt.Errorf("invalid folder id: %w", err)
		}
		folderID = &parsed
	}

	basePath, err = paths.GetFilesPath()
	if err != nil {
		serverlog.Errorf("Could not get default path: %v", err)
		basePath = ""
	}
	return files, pinCode, folderID, contentType, basePath, displayName, nil
}

func UploadHandler(c *gin.Context) {
	files, pinCode, folderID, contentType, basePath, displayName, err := parseUploadForm(c)
	if err != nil {
		serverlog.Warnf("upload parse error: %v", err)
		c.String(http.StatusBadRequest, err.Error())
		return
	}

	switch contentType {
	case "file":
		if len(files) == 0 {
			c.String(http.StatusBadRequest, "No file provided")
			return
		}
		if err := handleSingleFile(files[0], pinCode, folderID, basePath, displayName); err != nil {
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

func uniqueDiskName(original string) string {
	ext := filepath.Ext(original)
	base := strings.TrimSuffix(original, ext)
	if base == "" {
		base = "upload"
	}
	return fmt.Sprintf("%s-%s%s", base, uuid.New().String(), ext)
}

func handleSingleFile(fh *multipart.FileHeader, pin string, folderID *uuid.UUID, basePath string, displayName string) error {
	var targetDir string
	var fileFolderID *uuid.UUID

	if folderID != nil {
		folder, err := storage.GetFolder(*folderID)
		if err != nil {
			return fmt.Errorf("folder not found: %w", err)
		}
		targetDir = folder.Path
		fileFolderID = &folder.ID
	} else {
		if basePath == "" {
			return fmt.Errorf("no base path available for upload")
		}
		targetDir = basePath
		fileFolderID = nil
	}

	diskPath := filepath.Join(targetDir, uniqueDiskName(fh.Filename))
	if err := services.SaveUploadedFile(fh, diskPath); err != nil {
		return fmt.Errorf("save uploaded file: %w", err)
	}
	finalName := fh.Filename
	if displayName != "" {
		finalName = displayName
		if filepath.Ext(finalName) == "" {
			finalName = finalName + filepath.Ext(fh.Filename)
		}
	}
	if err := services.SaveFile(finalName, diskPath, pin, fileFolderID); err != nil {
		return fmt.Errorf("save file meta: %w", err)
	}
	return nil
}

func handleMultipleFiles(files []*multipart.FileHeader, pin string, folderID *uuid.UUID, basePath string) error {
	var targetDir string
	var fileFolderID *uuid.UUID

	if folderID != nil {
		f, err := storage.GetFolder(*folderID)
		if err != nil {
			return fmt.Errorf("folder not found: %w", err)
		}
		targetDir = f.Path
		fileFolderID = &f.ID
	} else {
		if basePath == "" {
			return fmt.Errorf("no base path available for upload")
		}
		targetDir = basePath
		fileFolderID = nil
	}

	for _, fh := range files {
		diskPath := filepath.Join(targetDir, uniqueDiskName(fh.Filename))

		if err := services.SaveUploadedFile(fh, diskPath); err != nil {
			serverlog.Errorf("failed saving uploaded bytes for %s: %v", fh.Filename, err)
			continue
		}

		if err := services.SaveFile(fh.Filename, diskPath, pin, fileFolderID); err != nil {
			serverlog.Errorf("failed saving metadata for %s: %v", fh.Filename, err)
			continue
		}
	}
	return nil
}
