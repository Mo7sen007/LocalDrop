package handlers

import (
	"errors"
	"log"
	"net/http"

	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/services"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

func LoginHandler(c *gin.Context) {
	userName := c.PostForm("username")
	password := c.PostForm("password")

	adminFilePath, err := paths.GetAdminFilePath()
	if err != nil {
		log.Printf("Couldn't get path")
		return
	}

	authenticated, err := services.AuthAdmin(userName, password, adminFilePath)
	if err != nil {
		if errors.Is(err, services.ErrWrongPassword) || errors.Is(err, services.ErrUserNotFound) {
			log.Printf("Invlaid email or password:%v", err)
			c.String(http.StatusUnauthorized, "Invalid email or password")
			return
		}
		log.Printf("Couldn't load list:%v", err)
		c.String(http.StatusInternalServerError, "Couldn't load list")
		return
	}

	if authenticated {
		session := sessions.Default(c)
		session.Set("user_id", userName)
		if err := session.Save(); err != nil {
			log.Printf("Failed to save session:%v", err)
			c.String(http.StatusInternalServerError, "Failed to save session")
			return
		}
		log.Printf("Login successful for admin:%s", userName)
		c.Redirect(http.StatusFound, "/dashboard")
		return
	}

}

func LogoutHandler(c *gin.Context) {
	session := sessions.Default(c)
	session.Clear()
	if err := session.Save(); err != nil {
		log.Printf("Failed to logout:%v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to logout"})
		return
	}
	log.Printf("logged out sucssessful")
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}
