package services

import (
	"fileshare/internal/models"
	"fileshare/internal/storage"
	"fmt"
	"net/http"
	"os"

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

func oldGetInitialListOfFiles(c *gin.Context) {
	files, err := os.ReadDir("files")
	var list []models.File
	if err != nil {
		c.String(http.StatusInternalServerError, fmt.Sprintf("error reading files:%v", err))
		return
	}
	for _, file := range files {

		if !file.IsDir() {
			uploadedFile := models.File{
				ID:   uuid.New(),
				Name: file.Name(),
				Path: "files/" + file.Name(),
			}
			list = append(list, uploadedFile)
			fmt.Printf("added %s", file.Name())
		}
	}

	c.JSON(http.StatusOK, list)
}
