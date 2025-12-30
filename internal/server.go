package internal

import (
	"crypto/rand"
	"embed"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"

	"github.com/Mo7sen007/LocalDrop/internal/handlers"
	"github.com/Mo7sen007/LocalDrop/internal/middleware"
	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/hashicorp/mdns"
)

//go:embed static/*
var staticFS embed.FS

type Server struct {
	router *gin.Engine
	dns    *mdns.Server
}

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

func NewServer(authEnabled bool) (*gin.Engine, *mdns.Server) {
	// host, _ := os.Hostname()
	service, err := mdns.NewMDNSService(
		"LocalDrop",                           // instance name
		"_http._tcp",                          // advertise as an HTTP service
		"",                                    // domain
		"localdrop.local.",                    // hostname to advertise
		8080,                                  // port
		[]net.IP{net.ParseIP("192.168.1.13")}, // auto-detect IP
		[]string{"path=/"},                    // TXT records
	)
	if err != nil {
		log.Fatalf("Failed to create mDNS service: %v", err)
	}

	mdnsServer, err := mdns.NewServer(&mdns.Config{Zone: service})
	if err != nil {
		log.Fatalf("Failed to start mDNS server: %v", err)
	}
	gin.SetMode(gin.ReleaseMode)

	entries, _ := fs.ReadDir(staticFS, "static")
	for _, e := range entries {
		log.Println("Embedded file:", e.Name())
	}

	if err := paths.Initialize(); err != nil {
		log.Fatal("Could not initialize storage:", err)
	}

	if err := storage.Init("localdrop.db"); err != nil {
		log.Fatal("Could not initialize database:", err)
	}

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
		c.FileFromFS("html/download.html", http.FS(staticSubFS))
	})
	router.GET("/download", func(c *gin.Context) {
		c.FileFromFS("html/download.html", http.FS(staticSubFS))
	})
	router.GET("/login", func(c *gin.Context) {
		c.FileFromFS("html/login.html", http.FS(staticSubFS))
	})

	router.GET("/rootfilesandfolders", handlers.GetRootFilesAndFoldersHandler)
	router.GET("/folder/content/:id", handlers.GetFolderHandler)
	router.GET("/allfiles", handlers.GetAllFilesHandler)

	router.GET("/listOfFiles", func(c *gin.Context) {
		rootFolder, err := storage.GetRoot()
		if err != nil {
			log.Println("Failed to load files:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		// Return the contents of the root folder (files and subfolders)
		// The frontend likely expects a list of items, or a folder object.
		// If the previous implementation returned a map/list of files, we might need to adjust.
		// But since we are moving to a folder structure, returning the root folder object is best.
		// However, dashboard.js expects a list of files.
		// Let's check dashboard.js again.
		c.JSON(http.StatusOK, rootFolder)
	})

	router.POST("/login", handlers.LoginHandler)
	router.POST("/logout", handlers.LogoutHandler)
	router.GET("/download/:id", handlers.DownloadFileHandler)
	router.GET("/download-folder/:id", handlers.DownloadFolderHandler)
	router.GET("/hasPin/:id", handlers.HasPinHandler)

	if authEnabled {
		authGroup := router.Group("/", middleware.AuthMiddleware())
		setupProtectedRoutes(authGroup)
	} else {
		setupProtectedRoutes(router.Group("/"))
	}

	return router, mdnsServer
}

func setupProtectedRoutes(group *gin.RouterGroup) {
	staticSubFS, _ := fs.Sub(staticFS, "static")
	group.GET("/dashboard", func(c *gin.Context) {
		c.FileFromFS("html/dashboard.html", http.FS(staticSubFS))
	})

	group.GET("/admin", func(c *gin.Context) {
		c.FileFromFS("html/dashboard.html", http.FS(staticSubFS))
	})

	group.POST("/upload", handlers.UploadFileHandler)
	group.DELETE("/delete/file/:id", handlers.DeleteFileHandler)
	group.DELETE("/delete/folder/:id", handlers.DeleteFolderHandler)

}
