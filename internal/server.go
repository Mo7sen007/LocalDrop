package internal

import (
	"crypto/rand"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"

	"github.com/Mo7sen007/LocalDrop/internal/handlers"
	"github.com/Mo7sen007/LocalDrop/internal/middleware"
	"github.com/Mo7sen007/LocalDrop/internal/models"
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
	router      *gin.Engine
	dns         *mdns.Server
	root        *models.Folder
	authEnabled bool
	port        int
}

func NewServer(authEnabled bool, port int) *Server {
	return &Server{
		authEnabled: authEnabled,
		port:        port,
	}
}

//helper functions for setupRouter()

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

func (s *Server) setupRouter() error {
	gin.SetMode(gin.ReleaseMode)
	s.router = gin.Default()
	staticSubFS, err := fs.Sub(staticFS, "static")
	if err != nil {
		log.Fatal("Failed to create static sub-filesystem:", err)
	}
	s.router.StaticFS("/static", http.FS(staticSubFS))
	s.router.MaxMultipartMemory = 8 << 20

	store := cookie.NewStore(getSecretKey())
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})
	s.router.Use(sessions.Sessions("localdrop_session", store))

	s.router.GET("/", func(c *gin.Context) {
		c.FileFromFS("html/download.html", http.FS(staticSubFS))
	})
	s.router.GET("/download", func(c *gin.Context) {
		c.FileFromFS("html/download.html", http.FS(staticSubFS))
	})
	s.router.GET("/login", func(c *gin.Context) {
		c.FileFromFS("html/login.html", http.FS(staticSubFS))
	})

	s.router.GET("/rootfilesandfolders", handlers.GetRootFilesAndFoldersHandler)
	s.router.GET("/folder/content/:id", handlers.GetFolderHandler)
	s.router.GET("/allfiles", handlers.GetAllFilesHandler)

	s.router.GET("/listOfFiles", func(c *gin.Context) {
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

	s.router.POST("/login", handlers.LoginHandler)
	s.router.POST("/logout", handlers.LogoutHandler)
	s.router.GET("/download/:id", handlers.DownloadFileHandler)
	s.router.GET("/download-folder/:id", handlers.DownloadFolderHandler)
	s.router.GET("/hasPin/:id", handlers.HasPinHandler)

	if s.authEnabled {
		authGroup := s.router.Group("/", middleware.AuthMiddleware())
		setupProtectedRoutes(authGroup)
	} else {
		setupProtectedRoutes(s.router.Group("/"))
	}

	return nil
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

func (s *Server) setupMDNS() error {
	// Get local IP address automatically
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return fmt.Errorf("failed to get network interfaces: %w", err)
	}

	var localIP net.IP
	for _, addr := range addrs {
		if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
			if ipNet.IP.To4() != nil {
				localIP = ipNet.IP
				break
			}
		}
	}

	if localIP == nil {
		localIP = net.ParseIP("127.0.0.1") // Fallback to localhost
	}

	service, err := mdns.NewMDNSService(
		"LocalDrop",        // instance name
		"_http._tcp",       // advertise as an HTTP service
		"",                 // domain (empty for .local)
		"localdrop.local.", // hostname to advertise
		s.port,             // port from server config
		[]net.IP{localIP},  // auto-detected IP
		[]string{"path=/"}, // TXT records
	)
	if err != nil {
		return fmt.Errorf("failed to create mDNS service: %w", err)
	}

	s.dns, err = mdns.NewServer(&mdns.Config{Zone: service})
	if err != nil {
		return fmt.Errorf("failed to start mDNS server: %w", err)
	}

	log.Printf("mDNS server started: %s:%d (IP: %s)", "localdrop.local.", s.port, localIP)
	return nil
}

func (s *Server) Init() error {
	if err := paths.Initialize(); err != nil {
		return fmt.Errorf("failed to initialize paths: %w", err)
	}

	// Initialize storage/database
	if err := storage.Init("localdrop.db"); err != nil {
		return fmt.Errorf("failed to initialize storage: %w", err)
	}

	// Setup router, mDNS, etc.
	if err := s.setupRouter(); err != nil {
		return fmt.Errorf("failed to setup router: %w", err)
	}

	if err := s.setupMDNS(); err != nil {
		return fmt.Errorf("failed to setup mDNS: %w", err)
	}

	s.root, _ = storage.GetRoot()

	return nil
}

func (s *Server) Start() error {
	err := s.router.Run(fmt.Sprintf(":%d", s.port))
	if err != nil {
		fmt.Printf("Server failed to start: %v\n", err)
	}
	return nil
}
