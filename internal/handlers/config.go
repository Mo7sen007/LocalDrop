package handlers

import (
	"net/http"

	"github.com/Mo7sen007/LocalDrop/internal/config"
	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/services/serverlog"
	"github.com/gin-gonic/gin"
)

func GetConfig(c *gin.Context) {
	var userConfig models.Config

	userConfig, err := config.GetConfig()

	if err != nil {
		serverlog.Errorf("config file error, %v", err)
		c.String(http.StatusInternalServerError, "config loading error")
		return
	}
	c.JSON(http.StatusOK, userConfig)

}

func UpdateConfig(c *gin.Context) {
	var requestBody models.Config

	if err := c.BindJSON(&requestBody); err != nil {
		serverlog.Errorf("couldn't parse config file, error:%v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Error parsing file"})
		return
	}

	if err := requestBody.Validate(); err != nil {
		serverlog.Warnf("invalid config update: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := config.SaveConfig(&requestBody)

	if err != nil {
		serverlog.Errorf("couldn't save config file, error:%v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error saving file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "saved"})
}
