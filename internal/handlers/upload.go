package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/Mo7sen007/LocalDrop/internal/dto"
	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/services"
	"github.com/Mo7sen007/LocalDrop/internal/services/serverlog"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func parseUploadForm(c *gin.Context) (dto.UploadRequestBody, string, error) {
	var requestBody dto.UploadRequestBody
	var basePath string
	form, err := c.MultipartForm()
	if err != nil {
		return dto.UploadRequestBody{}, "", fmt.Errorf("multipart form: %w", err)
	}

	requestBody.FileHeaders = form.File["files"]
	requestBody.PinCode = c.PostForm("pin_code")
	if requestBody.PinCode == "" {
		requestBody.PinCode = c.PostForm("pinCode")
	}

	requestBody.DisplayName = strings.TrimSpace(c.PostForm("display_name"))
	if requestBody.DisplayName == "" {
		requestBody.DisplayName = strings.TrimSpace(c.PostForm("fileName"))
	}

	folderIdStr := c.PostForm("parent_id")
	if folderIdStr == "" {
		folderIdStr = c.PostForm("folderId")
	}

	requestBody.ContentType = c.PostForm("contentType")
	if requestBody.ContentType == "" {
		requestBody.ContentType = c.PostForm("type")
	}

	if requestBody.PinCode != "" {
		requestBody.PinCode, err = services.HashPassword(requestBody.PinCode)
		if err != nil {
			return dto.UploadRequestBody{}, "", fmt.Errorf("error parsing pin code: %w", err)
		}
	}

	if folderIdStr != "" {
		parsed, err := uuid.Parse(folderIdStr)
		if err != nil {
			return dto.UploadRequestBody{}, "", fmt.Errorf("invalid folder id: %w", err)
		}
		requestBody.ParentFolderID = &parsed
	}

	basePath, err = paths.GetFilesPath()
	if err != nil {
		serverlog.Errorf("Could not get default path: %v", err)
		basePath = ""
	}
	return requestBody, basePath, nil
}

func UploadHandler(c *gin.Context) {
	requestBody, basePath, err := parseUploadForm(c)
	if err != nil {
		serverlog.Warnf("upload parse error: %v", err)
		c.String(http.StatusBadRequest, err.Error())
		return
	}

	switch requestBody.ContentType {
	case "file":
		if len(requestBody.FileHeaders) == 0 {
			c.String(http.StatusBadRequest, "No file provided")
			return
		}
		if err := handleSingleFile(requestBody, basePath); err != nil {
			c.String(http.StatusInternalServerError, err.Error())
			return
		}
		c.String(http.StatusOK, "File uploaded successfully!")
	case "files":
		if len(requestBody.FileHeaders) == 0 {
			c.String(http.StatusBadRequest, "No files provided")
			return
		}
		if err := handleMultipleFiles(requestBody, basePath); err != nil {
			c.String(http.StatusInternalServerError, err.Error())
			return
		}
		c.String(http.StatusOK, fmt.Sprintf("%d files uploaded successfully!", len(requestBody.FileHeaders)))
	case "folder":
		if len(requestBody.FileHeaders) == 0 {
			c.String(http.StatusBadRequest, "No files provided")
			return
		}
		form, _ := c.MultipartForm()
		pathsList := form.Value["paths"]
		if err := services.SaveFolder(requestBody.FileHeaders, pathsList, requestBody.ParentFolderID, requestBody.PinCode, requestBody.DisplayName); err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("Failed to upload folder: %v", err))
			return
		}
		c.String(http.StatusOK, fmt.Sprintf("Folder uploaded successfully with %d files!", len(requestBody.FileHeaders)))
	default:
		c.String(http.StatusBadRequest, "Invalid upload type: %s", requestBody.ContentType)
	}
}

func uniqueDiskName(original string) string {

	sanetizedName := filepath.Base(original)

	ext := filepath.Ext(sanetizedName)
	base := strings.TrimSuffix(sanetizedName, ext)
	if base == "" {
		base = "upload"
	}
	return fmt.Sprintf("%s-%s%s", base, uuid.New().String(), ext)
}

func handleSingleFile(requestBody dto.UploadRequestBody, basePath string) error {
	var targetDir string
	var fileFolderID *uuid.UUID

	if requestBody.ParentFolderID != nil {
		folder, err := storage.GetFolder(*requestBody.ParentFolderID)
		if err != nil {
			return fmt.Errorf("folder not found: %w", err)
		}
		targetDir = folder.Path
		fileFolderID = &folder.ID
	} else {
		rootFolder, err := storage.GetRoot()
		if err != nil {
			return fmt.Errorf("no root folder available for upload: %w", err)
		}
		targetDir = rootFolder.Path
		fileFolderID = nil
	}

	fileHeader := requestBody.FileHeaders[0]
	diskPath := filepath.Join(targetDir, uniqueDiskName(fileHeader.Filename))
	if err := services.SaveUploadedFileAndCreateRecord(fileHeader, diskPath, requestBody.PinCode, fileFolderID, requestBody.DisplayName); err != nil {
		return fmt.Errorf("save upload: %w", err)
	}
	return nil
}

func handleMultipleFiles(requestBody dto.UploadRequestBody, basePath string) error {
	var targetDir string
	var fileFolderID *uuid.UUID

	if requestBody.ParentFolderID != nil {
		f, err := storage.GetFolder(*requestBody.ParentFolderID)
		if err != nil {
			return fmt.Errorf("folder not found: %w", err)
		}
		targetDir = f.Path
		fileFolderID = &f.ID
	} else {
		rootFolder, err := storage.GetRoot()
		if err != nil {
			return fmt.Errorf("no root folder available for upload: %w", err)
		}
		targetDir = rootFolder.Path
		fileFolderID = nil
	}

	for _, fh := range requestBody.FileHeaders {
		diskPath := filepath.Join(targetDir, uniqueDiskName(fh.Filename))

		if err := services.SaveUploadedFileAndCreateRecord(fh, diskPath, requestBody.PinCode, fileFolderID, ""); err != nil {
			serverlog.Errorf("failed saving upload for %s: %v", fh.Filename, err)
			continue
		}
	}
	return nil
}
