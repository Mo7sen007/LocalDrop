package internal

import (
	"crypto/rand"
	"embed"
	"fmt"
	"io/fs"
	"net"
	"net/http"

	"github.com/Mo7sen007/LocalDrop/internal/config"
	"github.com/Mo7sen007/LocalDrop/internal/handlers"
	"github.com/Mo7sen007/LocalDrop/internal/middleware"
	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/services"
	"github.com/Mo7sen007/LocalDrop/internal/services/serverlog"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
	storagesql "github.com/Mo7sen007/LocalDrop/internal/storage/sql"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/hashicorp/mdns"
)

//go:embed static/*
var staticFS embed.FS

type Server struct {
	router        *gin.Engine
	dns           *mdns.Server
	root          *models.Folder
	config        *models.Config
	folderHandler *handlers.FolderHandler
	fileHandler   *handlers.FileHandler
	adminHandler  *handlers.AdminHandler
}

func NewServer(port *int, authEnabled *bool, loggingLevel *string) (*Server, error) {
	var server Server
	serverConfig, err := config.GetConfig()
	if err != nil {
		serverlog.Errorf("Faild to get server config")
		return nil, fmt.Errorf("failed to get server config: %w", err)
	}
	if port != nil {
		serverConfig.App.Port = *port
	}
	if authEnabled != nil {
		serverConfig.Auth.Enabled = *authEnabled
	}
	if loggingLevel != nil && *loggingLevel != "" {
		serverConfig.Logging.Level = *loggingLevel
	}

	err = serverConfig.Validate()
	if err != nil {
		serverlog.Errorf("Invalid parameters:%v", err)
		return nil, fmt.Errorf("incalid parameters:%w", err)
	}
	server.config = &serverConfig
	err = config.SaveConfig(&serverConfig)
	if err != nil {
		serverlog.Errorf("failed to save config to disk:%v", err)
		return nil, fmt.Errorf("failed to save config to disk:%w", err)
	}

	return &server, nil
}

//helper functions for setupRouter()

func generateSecretKey() []byte {
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		serverlog.Errorf("Failed to generate secret key: %v", err)
		return nil
	}
	return key
}

func getSecretKey() []byte {
	if key, ok := config.GetString("SESSION_SECRET"); ok {
		return []byte(key)
	}

	if config.IsProduction() {
		serverlog.Errorf("SESSION_SECRET is required in production (set SESSION_SECRET, or LOCALDROP_ENV=prod/production)")
		return nil
	}

	if config.GetBoolDefault("SESSION_SECRET_RANDOM", false) {
		serverlog.Warnf("SESSION_SECRET_RANDOM=true; using a random per-start session secret")
		return generateSecretKey()
	}

	serverlog.Warnf("SESSION_SECRET not set; using an insecure default dev session secret")
	return []byte("localdrop-dev-session-secret-change-me")
}

func getSessionCookieSecureDefault() bool {

	return config.IsProduction()
}

func getSessionCookieSecure() bool {
	return config.GetBoolDefault("SESSION_COOKIE_SECURE", getSessionCookieSecureDefault())
}

func getGinMod() string {
	if mode, ok := config.GetString("GIN_MODE"); ok {
		return mode
	}
	if config.IsProduction() {
		return gin.ReleaseMode
	}
	return gin.DebugMode
}

func (s *Server) setupRouter() error {

	gin.SetMode(getGinMod())

	s.router = gin.Default()

	staticSubFS, err := fs.Sub(staticFS, "static")
	if err != nil {
		serverlog.Errorf("Failed to create static sub-filesystem: %v", err)
		return err
	}
	s.router.StaticFS("/static", http.FS(staticSubFS))
	s.router.MaxMultipartMemory = s.config.Storage.MaxFileSize

	store := cookie.NewStore(getSecretKey())
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7,
		HttpOnly: true,
		Secure:   getSessionCookieSecure(),
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

	s.router.GET("/listOfFiles", func(c *gin.Context) {
		rootFolder, err := storage.GetRoot()
		if err != nil {
			serverlog.Errorf("Failed to load files: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, rootFolder)
	})

	s.router.POST("/login", handlers.LoginHandler)
	s.router.POST("/logout", handlers.LogoutHandler)
	s.router.GET("/download/:id", handlers.DownloadFileHandler)
	s.router.GET("/download-folder/:id", handlers.DownloadFolderHandler)

	if s.config.Auth.Enabled {
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

	group.GET("/config", func(c *gin.Context) {
		c.FileFromFS("html/config.html", http.FS(staticSubFS))
	})

	group.GET("/admin", func(c *gin.Context) {
		c.FileFromFS("html/dashboard.html", http.FS(staticSubFS))
	})

	group.POST("/upload", handlers.UploadHandler)
	group.DELETE("/delete/file/:id", handlers.DeleteFileHandler)
	group.DELETE("/delete/folder/:id", handlers.DeleteFolderHandler)

	group.GET("/config/api", handlers.GetConfig)
	group.PUT("/config/api", handlers.UpdateConfig)

}

func (s *Server) setupMDNS() error {

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
		localIP = net.ParseIP("127.0.0.1")
	}

	service, err := mdns.NewMDNSService(
		"LocalDrop",        // instance name
		"_http._tcp",       // advertise as an HTTP service
		"",                 // domain (empty for .local)
		"localdrop.local.", // hostname to advertise
		s.config.App.Port,  // port from app config
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

	serverlog.Infof("mDNS server started: %s:%d (IP: %s)", "localdrop.local.", s.config.App.Port, localIP)
	return nil
}

func (s *Server) Init() error {
	var err error
	if err := paths.Initialize(); err != nil {
		return fmt.Errorf("failed to initialize paths: %w", err)
	}

	db, err := storagesql.Init()
	if err != nil {
		return fmt.Errorf("failed to initialize storage: %w", err)
	}
	// keep db open for server lifetime (close on shutdown)
	repo := storagesql.NewSQLRepository(db)
	fileRepo := 

	// construct services using interfaces and the single concrete repo
	fileSvc := services.NewFileService(repo)
	folderSvc := services.NewFolderService(repo, repo, fileSvc)
	adminSvc := services.NewAdminService(repo)

	// construct handlers/controllers with services
	s.folderHandler = handlers.NewFolderHandler(folderSvc, fileSvc)
	s.fileHandler = handlers.NewFileHandler(fileSvc)
	s.adminHandler = handlers.NewAdminHandler(adminSvc)

	// Setup router, mDNS, etc.
	if err := s.setupRouter(); err != nil {
		return fmt.Errorf("failed to setup router: %w", err)
	}

	if err := s.setupMDNS(); err != nil {
		return fmt.Errorf("failed to setup mDNS: %w", err)
	}

	s.root, err = repo.GetRoot()
	if err != nil {
		return fmt.Errorf("failed to get root folder: %w", err)
	}

	return nil
}

func (s *Server) Start() error {
	err := s.router.Run(fmt.Sprintf(":%d", s.config.App.Port))
	if err != nil {
		fmt.Printf("Server failed to start: %v\n", err)
	}
	return nil
}
