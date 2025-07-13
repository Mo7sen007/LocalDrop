package services

import (
	"fileshare/internal/models"
	"fileshare/internal/storage"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetInitialListOfFiles(c *gin.Context) {
	list, err := storage.LoadFiles()
	if err != nil {
		c.String(http.StatusInternalServerError, fmt.Sprintf("error loading files:%v", err))
		return
	}

	c.JSON(http.StatusOK, list)
}

func GetFileById(id uuid.UUID, listOfFiles *[]models.File) (models.File, bool) {
	for _, file := range *listOfFiles {
		if file.ID == id {
			return file, true
		}
	}
	return models.File{}, false
}
