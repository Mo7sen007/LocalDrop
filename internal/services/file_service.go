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

func GetFileByID(id uuid.UUID, List map[uuid.UUID]models.File) (models.File, bool) {
	file, ok := List[id]
	return file, ok
}

func HasPinCode(file models.File) bool {
	return file.Pin != ""
}
