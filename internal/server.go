package internal

import (
	"crypto/rand"
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"

	"github.com/Mo7sen007/LocalDrop/internal/handlers"
	"github.com/Mo7sen007/LocalDrop/internal/middleware"
	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
)

//go:embed static/*
var staticFS embed.FS

func generateSecretKey() []byte {
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		log.Fatal("Failed to generate secret key:", err)
		return nil
	}
	return key
}

func getSecretKey() []byte {
	if key := os.Getenv("SESSION_SECRET"); key != "" {
		return []byte(key)
	}

	return generateSecretKey()
}

func NewServer(authEnabled bool) *gin.Engine {

	gin.SetMode(gin.ReleaseMode)

	entries, _ := fs.ReadDir(staticFS, "static")
	for _, e := range entries {
		log.Println("Embedded file:", e.Name())
	}

	if err := paths.Initialize(); err != nil {
		log.Fatal("Could not initialize storage:", err)
	}

	list, err := storage.InitializeListOfFiles()
	if err != nil {
		log.Println("Could not initialize file list:", err)
		log.Fatal(err)
	}
	log.Printf("Loaded %d files into storage\n", len(list))

	router := gin.Default()
	staticSubFS, err := fs.Sub(staticFS, "static")
	if err != nil {
		log.Fatal("Failed to create static sub-filesystem:", err)
	}

	router.StaticFS("/static", http.FS(staticSubFS))

	router.MaxMultipartMemory = 8 << 20

	store := cookie.NewStore(getSecretKey())
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})
	router.Use(sessions.Sessions("localdrop_session", store))

	router.GET("/", func(c *gin.Context) {
		c.FileFromFS("download.html", http.FS(staticSubFS))
	})
	router.GET("/download", func(c *gin.Context) {
		c.FileFromFS("download.html", http.FS(staticSubFS))
	})
	router.GET("/login", func(c *gin.Context) {
		c.FileFromFS("login.html", http.FS(staticSubFS))
	})

	router.GET("/listOfFiles", func(c *gin.Context) {
		listOfFiles, err := storage.LoadFiles()
		if err != nil {
			log.Println("Failed to load files:", err) // logs to file
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		log.Printf("Returned %d files to client\n", len(listOfFiles))
		c.JSON(http.StatusOK, listOfFiles)
	})

	router.POST("/login", handlers.LoginHandler)
	router.POST("/logout", handlers.LogoutHandler)
	router.GET("/download/:id", handlers.DownloadFileHandler)
	router.GET("/hasPin/:id", handlers.HasPinHandler)

	if authEnabled {
		authGroup := router.Group("/", middleware.AuthMiddleware())
		setupProtectedRoutes(authGroup)
	} else {
		setupProtectedRoutes(router.Group("/"))
	}

	return router
}

func setupProtectedRoutes(group *gin.RouterGroup) {
	staticSubFS, _ := fs.Sub(staticFS, "static")
	group.GET("/dashboard", func(c *gin.Context) {
		c.FileFromFS("dashboard.html", http.FS(staticSubFS))
	})

	group.GET("/admin", func(c *gin.Context) {
		c.FileFromFS("dashboard.html", http.FS(staticSubFS))
	})

	group.POST("/upload", handlers.UploadFileHandler)
	group.GET("/delete/:id", handlers.DeleteFileHandler)
}
