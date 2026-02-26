package handlers

import (
	"errors"
	"net/http"

	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/services"
	"github.com/Mo7sen007/LocalDrop/internal/services/serverlog"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	services *services.AdminService
}

func NewAdminHandler(services *services.AdminService) *AdminHandler {
	return &AdminHandler{services: services}
}

func (h *AdminHandler) LoginHandler(c *gin.Context) {
	userName := c.PostForm("username")
	password := c.PostForm("password")

	adminFilePath, err := paths.GetAdminFilePath()
	if err != nil {
		serverlog.Errorf("Couldn't get path")
		return
	}

	authenticated, err := h.services.AuthAdmin(userName, password, adminFilePath)
	if err != nil {
		if errors.Is(err, services.ErrWrongPassword) || errors.Is(err, services.ErrUserNotFound) {
			serverlog.Warnf("Invlaid email or password:%v", err)
			c.String(http.StatusUnauthorized, "Invalid email or password")
			return
		}
		serverlog.Errorf("Couldn't load list:%v", err)
		c.String(http.StatusInternalServerError, "Couldn't load list")
		return
	}

	if authenticated {
		session := sessions.Default(c)
		session.Set("user_id", userName)
		if err := session.Save(); err != nil {
			serverlog.Errorf("Failed to save session:%v", err)
			c.String(http.StatusInternalServerError, "Failed to save session")
			return
		}
		serverlog.Infof("Login successful for admin:%s", userName)
		c.Redirect(http.StatusFound, "/dashboard")
		return
	}

}

func (h *AdminHandler) LogoutHandler(c *gin.Context) {
	session := sessions.Default(c)
	session.Clear()
	if err := session.Save(); err != nil {
		serverlog.Errorf("Failed to logout:%v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to logout"})
		return
	}
	serverlog.Infof("logged out sucssessful")
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}
