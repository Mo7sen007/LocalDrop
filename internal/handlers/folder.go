package handlers

import (
	"archive/zip"
	"fmt"
	"net/http"

	"github.com/Mo7sen007/LocalDrop/internal/dto"
	"github.com/Mo7sen007/LocalDrop/internal/services"
	"github.com/Mo7sen007/LocalDrop/internal/services/serverlog"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type FolderHandler struct {
	services    *services.FolderService
	fileService *services.FileService
}

func NewFolderHandler(services *services.FolderService, fileService *services.FileService) *FolderHandler {
	return &FolderHandler{services: services,
		fileService: fileService}
}

func (h *FolderHandler) GetRootFolderHandler(c *gin.Context) {
	rootFolder, err := h.services.GetRootFolder()
	if err != nil {
		serverlog.Errorf("Failed to get root folder:%v", err)
		c.String(http.StatusInternalServerError, "Failed to get root folder")
		return
	}
	c.JSON(http.StatusOK, dto.CreateResponseBody(*rootFolder))
}

func (h *FolderHandler) DownloadFolderHandler(c *gin.Context) {
	folderIDStr := c.Param("id")
	pinCode := c.Query("pin")
	folderId, err := uuid.Parse(folderIDStr)
	if err != nil {
		c.String(http.StatusBadRequest, "Invalid UUID format")
		return
	}

	folder, err := h.services.GetFolderByID(folderId)
	if err != nil {
		c.String(http.StatusNotFound, "Folder not found")
		return
	}

	if folder.PinCode != nil && *folder.PinCode != "" {
		if pinCode == "" {
			c.String(http.StatusUnauthorized, "PIN code required")
			return
		}

		verified := services.CheckPasswordHash(pinCode, *folder.PinCode)
		if !verified {
			c.String(http.StatusUnauthorized, "Incorrect PIN code")
			return
		}
	}
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.zip\"", folder.Name))
	c.Header("Content-Type", "application/zip")

	zipWriter := zip.NewWriter(c.Writer)
	defer zipWriter.Close()

	if err := h.services.CreateFolderZip(folder, "", c.Writer); err != nil {
		serverlog.Errorf("Error creating zip: %v", err)
		return
	}
}

func (h *FolderHandler) DeleteFolderHandler(c *gin.Context) {
	folderIDStr := c.Param("id")
	folderId, err := uuid.Parse(folderIDStr)
	if err != nil {
		c.String(http.StatusBadRequest, "Invalid UUID format")
		return
	}
	err = h.services.DeleteFolder(folderId)
	if err != nil {
		c.String(http.StatusInternalServerError, fmt.Sprintf("error couldn't delete file:%v", err))
	}
	c.String(http.StatusOK, fmt.Sprintf("deleted folder:%s", folderIDStr))
}

func (h *FolderHandler) GetRootFilesAndFoldersHandler(c *gin.Context) {
	rootFolder, err := h.services.GetRootFolder()
	if err != nil {
		serverlog.Errorf("Failed to get root folder:%v", err)
		c.String(http.StatusInternalServerError, "Failed to get root folder")
	}

	c.JSON(http.StatusOK, dto.CreateResponseBody(*rootFolder))
}

func (h *FolderHandler) GetFolderHandler(c *gin.Context) {
	folderIDStr := c.Param("id")
	pinCode := c.Query("pin")
	folderId, err := uuid.Parse(folderIDStr)
	if err != nil {
		c.String(http.StatusBadRequest, "Invalid UUID format")
		return
	}
	folderMeta, err := h.services.GetFolderByID(folderId)
	if err != nil {
		c.String(http.StatusNotFound, "Folder not found")
		return
	}
	if folderMeta.PinCode != nil && *folderMeta.PinCode != "" {
		if pinCode == "" {
			c.String(http.StatusUnauthorized, "PIN code required")
			return
		}
		verified := services.CheckPasswordHash(pinCode, *folderMeta.PinCode)
		if !verified {
			c.String(http.StatusUnauthorized, "Incorrect PIN code")
			return
		}
	}

	c.JSON(http.StatusOK, dto.CreateResponseBody(*folderMeta))
}
