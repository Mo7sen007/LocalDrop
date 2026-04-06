package internal

import (
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
	uploadHandler *handlers.UploadHandler
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
		key, err := services.GenerateSessionKey()
		if err != nil {
			serverlog.Errorf("Failed to generate random session secret: %v", err)
			return nil
		}
		return key
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

func (s *Server) setupRouter(fileHandler *handlers.FileHandler, folderHandler *handlers.FolderHandler, adminHandler *handlers.AdminHandler, uploadHandler *handlers.UploadHandler) error {

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

	s.router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	s.router.GET("/", func(c *gin.Context) {
		c.FileFromFS("html/download.html", http.FS(staticSubFS))
	})
	s.router.GET("/download", func(c *gin.Context) {
		c.FileFromFS("html/download.html", http.FS(staticSubFS))
	})
	s.router.GET("/login", func(c *gin.Context) {
		c.FileFromFS("html/login.html", http.FS(staticSubFS))
	})

	s.router.GET("/rootfilesandfolders", folderHandler.GetRootFilesAndFoldersHandler)
	s.router.GET("/folder/content/:id", folderHandler.GetFolderHandler)

	s.router.GET("/listOfFiles", folderHandler.GetRootFolderHandler)

	s.router.POST("/login", adminHandler.LoginHandler)
	s.router.POST("/logout", adminHandler.LogoutHandler)
	s.router.GET("/download/:id", fileHandler.DownloadFileHandler)
	s.router.GET("/download-folder/:id", folderHandler.DownloadFolderHandler)

	if s.config.Auth.Enabled {
		authGroup := s.router.Group("/", middleware.AuthMiddleware())
		setupProtectedRoutes(authGroup, fileHandler, folderHandler, adminHandler, uploadHandler)
	} else {
		setupProtectedRoutes(s.router.Group("/"), fileHandler, folderHandler, adminHandler, uploadHandler)
	}

	return nil
}

func setupProtectedRoutes(group *gin.RouterGroup, fileHandler *handlers.FileHandler, folderHandler *handlers.FolderHandler, adminHandler *handlers.AdminHandler, uploadHandler *handlers.UploadHandler) {
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

	group.POST("/upload", uploadHandler.UploadHandler)
	group.DELETE("/delete/file/:id", fileHandler.DeleteFileHandler)
	group.DELETE("/delete/folder/:id", folderHandler.DeleteFolderHandler)

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

	repo := storagesql.NewSQLRepository(db)

	fileSvc := services.NewFileService(repo)
	folderSvc := services.NewFolderService(repo, repo, fileSvc)
	adminSvc := services.NewAdminService(repo)

	s.folderHandler = handlers.NewFolderHandler(folderSvc, fileSvc)
	s.fileHandler = handlers.NewFileHandler(fileSvc)
	s.adminHandler = handlers.NewAdminHandler(adminSvc)
	s.uploadHandler = handlers.NewUploadHandler(folderSvc, fileSvc)

	// Setup router, mDNS, etc.
	if err := s.setupRouter(s.fileHandler, s.folderHandler, s.adminHandler, s.uploadHandler); err != nil {
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
