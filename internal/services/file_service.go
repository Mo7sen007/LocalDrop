package services

import (
	"fmt"
	"net/http"

	"github.com/Mo7sen007/LocalDrop/internal/models"
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
	return file.Pin != ""
}
