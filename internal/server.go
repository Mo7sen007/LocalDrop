package internal

import (
	"crypto/rand"
	"log"
	"net/http"
	"os"

	"github.com/Mo7sen007/LocalDrop/internal/handlers"
	"github.com/Mo7sen007/LocalDrop/internal/services"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
)

// generateSecretKey generates a cryptographically secure random key
func generateSecretKey() []byte {
	key := make([]byte, 32) // 32 bytes = 256 bits
	if _, err := rand.Read(key); err != nil {
		log.Fatal("Failed to generate secret key:", err)
	}
	return key
}

// getSecretKey gets the secret key from environment or generates one
func getSecretKey() []byte {
	if key := os.Getenv("SESSION_SECRET"); key != "" {
		return []byte(key)
	}
	// Generate a new key each time (sessions won't persist across restarts)
	// For production, you should use a persistent key
	return generateSecretKey()
}

func NewServer(authEnabled bool) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)

	// Initialize file storage - fail fast if this doesn't work
	_, err := storage.InitializeListOfFiles()
	if err != nil {
		log.Fatal("Could not initialize file list:", err)
	}

	router := gin.Default()
	router.Static("/static", "./static")
	router.MaxMultipartMemory = 8 << 20 // 8 MiB

	// Session management with secure secret key
	store := cookie.NewStore(getSecretKey())
	// Configure session options for security
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7, // 7 days
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteLaxMode,
	})
	router.Use(sessions.Sessions("localdrop_session", store))

	// Public routes
	router.GET("/", func(c *gin.Context) {
		c.File("./static/download.html")
	})

	router.GET("/download", func(c *gin.Context) {
		c.File("./static/download.html")
	})

	router.GET("/login", func(c *gin.Context) {
		c.File("./static/login.html")
	})

	// Public API routes
	router.GET("/listOfFiles", func(c *gin.Context) {
		listOfFiles, err := storage.LoadFiles()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load files"})
			return // Important: return after error response
		}
		c.JSON(http.StatusOK, listOfFiles)
	})

	router.POST("/login", handlers.LoginHandler)
	router.POST("/logout", handlers.LogoutHandler)
	router.GET("/download/:id", handlers.DownloadFileHandler)
	router.GET("/hasPin/:id", handlers.HasPinHandler)

	// Protected routes setup
	if authEnabled {
		authGroup := router.Group("/", services.AuthMiddleware())
		setupProtectedRoutes(authGroup)
	} else {
		setupProtectedRoutes(router.Group("/")) // make it explicit
	}

	return router
}

// setupProtectedRoutes sets up routes that may or may not require auth
func setupProtectedRoutes(group *gin.RouterGroup) {
	group.GET("/dashboard", func(c *gin.Context) {
		c.File("./static/index.html")
	})

	group.GET("/admin", func(c *gin.Context) {
		c.File("./static/index.html")
	})

	group.POST("/upload", handlers.UploadFileHandler)
	group.GET("/delete/:id", handlers.DeleteFileHandler)
}
