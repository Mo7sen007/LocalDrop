package handlers

import (
	"fileshare/internal/models"
	"fileshare/internal/storage"
	"fmt"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func DownloadFileHandler(c *gin.Context) {

	listOfFiles := storage.List

	fileIdStr := c.Param("id")
	pinCode := c.Query("pin")
	fileId, err := uuid.Parse(fileIdStr)
	if err != nil {
		c.String(http.StatusBadRequest, "Invalid UUID format")
		return
	}

	file, found := models.GtFileById(fileId, &listOfFiles)
	if !found {
		c.String(http.StatusNotFound, "File not found")
		return
	}
	if pinCode == file.Pin {
		c.FileAttachment(file.Path, file.Name)
	} else {
		c.String(http.StatusBadRequest, "pin code is incorrect")
	}

}

func UploadFileHandler(c *gin.Context) {

	listOfFiles := storage.List

	uploaded, err := c.FormFile("file")

	if err != nil {
		c.String(http.StatusBadRequest, "File upload error: %v", err)
		return
	}
	pinCode := c.PostForm("pinCode")
	name := c.PostForm("fileName") + "." + strings.Split(uploaded.Filename, ".")[1]

	filePath := "./files/" + name // uploaded.Filename

	if err := c.SaveUploadedFile(uploaded, filePath); err != nil {
		c.String(http.StatusInternalServerError, "Could not save file: %v", err)
		return
	}

	info, err := os.Stat(filePath)
	if err != nil {
		c.String(http.StatusInternalServerError, "Failed to get file metadata: %v", err)
		return
	}

	ext := filepath.Ext(filePath)
	mimeType := mime.TypeByExtension(ext)

	uploadedFile := models.File{
		ID:        uuid.New(),
		Name:      name,
		Path:      filePath,
		Pin:       pinCode,
		Size:      info.Size(),
		Extension: ext,
		MIMEType:  mimeType,
		ModTime:   info.ModTime(),
	}
	UpadtedlistOfFiles := append(listOfFiles, uploadedFile)

	err = storage.UpdateFiles(UpadtedlistOfFiles)
	if err != nil {
		c.String(http.StatusInternalServerError, "Failed to update: %v", err)
		return
	}

	c.String(http.StatusOK, fmt.Sprintf("'%s' uploaded!", uploaded.Filename))
}

func DeleteFileHandler(c *gin.Context) {

	listOfFiles := storage.List

	fileIdStr := c.Param("id")
	fileId, err := uuid.Parse(fileIdStr)
	if err != nil {
		c.String(http.StatusBadRequest, "Invalid UUID format")
		return
	}
	file, found := models.GtFileById(fileId, &listOfFiles)
	if !found {
		c.String(http.StatusNotFound, "File not found")
		return
	}
	err = os.Remove(file.Path)
	if err != nil {
		c.String(http.StatusInternalServerError, "Error deleting file")
		return
	}
	for i, file := range listOfFiles {
		if file.ID == fileId {
			listOfFiles = append(listOfFiles[:i], listOfFiles[i+1:]...)
			storage.UpdateFiles(listOfFiles)
			break
		}
	}
	c.String(http.StatusOK, fmt.Sprintf("File '%s' deleted successfully", file.Name))

}
