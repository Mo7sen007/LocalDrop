package handlers

import (
	"fmt"
	"net/http"

	"github.com/Mo7sen007/LocalDrop/internal/services"
	"github.com/Mo7sen007/LocalDrop/internal/services/serverlog"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type FileHandler struct {
	services *services.FileService
}

func NewFileHandler(services *services.FileService) *FileHandler {
	return &FileHandler{services: services}
}

func (h *FileHandler) DownloadFileHandler(c *gin.Context) {
	fileIdStr := c.Param("id")
	pinCode := c.Query("pin")
	fileId, err := uuid.Parse(fileIdStr)
	if err != nil {
		serverlog.Warnf("invalid UUID format:%v", err)
		c.String(http.StatusBadRequest, "Invalid UUID format")
		return
	}

	file, found := h.services.GetFileByID(fileId)
	if !found {
		serverlog.Warnf("File not found")
		c.String(http.StatusNotFound, "File not found")
		return
	}

	if file.Pin != nil && *file.Pin != "" {

		if pinCode == "" {
			c.String(http.StatusUnauthorized, "PIN code required")
			return
		}

		verified := services.CheckPasswordHash(pinCode, *file.Pin)
		if !verified {
			c.String(http.StatusUnauthorized, "Incorrect PIN code")
			return
		}
	}

	serverlog.Infof("Sent %s with size of %d", file.Name, file.Size)
	c.FileAttachment(file.Path, file.Name)
}

func (h *FileHandler) DeleteFileHandler(c *gin.Context) {
	fileIdStr := c.Param("id")
	fileId, err := uuid.Parse(fileIdStr)
	if err != nil {
		serverlog.Warnf("Invalid UUID format:%v", err)
		c.String(http.StatusBadRequest, "Invalid UUID format")
		return
	}
	file, found := h.services.GetFileByID(fileId)
	if !found {
		serverlog.Warnf("File not found")
		c.String(http.StatusNotFound, "File not found")
		return
	}

	err = h.services.DeleteFile(fileId)
	if err != nil {
		serverlog.Errorf("Error deleting file from db:%v", err)
		c.String(http.StatusInternalServerError, "Error deleting file from db")
		return
	}

	serverlog.Infof("Deleted file with ID:%s ", fileIdStr)
	c.String(http.StatusOK, fmt.Sprintf("File '%s' deleted successfully", file.Name))
}
