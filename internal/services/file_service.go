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
