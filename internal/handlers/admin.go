package handlers

import (
	"errors"
	"net/http"

	"github.com/Mo7sen007/LocalDrop/internal/services"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

func LoginHandler(c *gin.Context) {
	userName := c.PostForm("username")
	password := c.PostForm("password")

	//only temporarly
	adminFilePath := "internal/storage/adminList.json"

	authenticated, err := services.AuthAdmin(userName, password, adminFilePath)
	if err != nil {
		if errors.Is(err, services.ErrWrongPassword) || errors.Is(err, services.ErrUserNotFound) {
			c.String(http.StatusUnauthorized, "Invalid email or password")
			return
		}
		c.String(http.StatusInternalServerError, "Couldn't load list")
		return
	}

	if authenticated {
		session := sessions.Default(c)
		session.Set("user_id", userName)
		if err := session.Save(); err != nil {
			c.String(http.StatusInternalServerError, "Failed to save session")
			return
		}

		c.Redirect(http.StatusFound, "/dashboard")
		return
	}

}

func LogoutHandler(c *gin.Context) {
	session := sessions.Default(c)
	session.Clear()
	if err := session.Save(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to logout"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}
