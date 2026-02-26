package handlers

import (
	"net/http"
	"os"
	"testing"

	"github.com/Mo7sen007/LocalDrop/internal/middleware"
	"github.com/Mo7sen007/LocalDrop/internal/services"
	storagesql "github.com/Mo7sen007/LocalDrop/internal/storage/sql"
	"github.com/Mo7sen007/LocalDrop/internal/testutil"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
)

func TestMain(m *testing.M) {
	tempDir, err := os.MkdirTemp("", "localdrop-test-")
	if err != nil {
		os.Exit(1)
	}
	defer os.RemoveAll(tempDir)

	testutil.SetTestEnv(tempDir)

	os.Exit(m.Run())
}

type handlerDeps struct {
	repo          *storagesql.SQLRepository
	fileService   *services.FileService
	folderService *services.FolderService
	fileHandler   *FileHandler
	folderHandler *FolderHandler
	uploadHandler *UploadHandler
}

func newHandlerDeps(t *testing.T) (*handlerDeps, func()) {
	t.Helper()

	deps, cleanup := testutil.SetupStorageDeps(t)
	return &handlerDeps{
		repo:          deps.Repo,
		fileService:   deps.FileService,
		folderService: deps.FolderService,
		fileHandler:   NewFileHandler(deps.FileService),
		folderHandler: NewFolderHandler(deps.FolderService, deps.FileService),
		uploadHandler: NewUploadHandler(deps.FolderService, deps.FileService),
	}, cleanup
}

func newTestRouter(authEnabled bool, uploadHandler gin.HandlerFunc, deleteFileHandler gin.HandlerFunc, deleteFolderHandler gin.HandlerFunc) *gin.Engine {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	store := cookie.NewStore([]byte("test-session-secret"))
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	router.Use(sessions.Sessions("localdrop_session", store))

	group := router.Group("/")
	if authEnabled {
		group = router.Group("/", middleware.AuthMiddleware())
	}

	group.POST("/upload", uploadHandler)
	group.DELETE("/delete/file/:id", deleteFileHandler)
	group.DELETE("/delete/folder/:id", deleteFolderHandler)

	return router
}
