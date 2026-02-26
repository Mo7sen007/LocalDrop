package storage

import (
	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/google/uuid"
)

type FolderRepository interface {
	// GetFolderByID returns a folder by its ID.
	GetFolderByID(folderId uuid.UUID) (*models.Folder, error)
	// GetFolderByNameAndParent returns a folder by its name and parent ID.
	GetFolderByNameAndParent(name string, parentId *uuid.UUID) (*models.Folder, error)
	// GetSubFolders returns the subfolders of a folder by its ID.
	GetSubFolders(folderId uuid.UUID) ([]*models.Folder, error)
	// CreateFolder creates a new folder.
	CreateFolder(folder *models.Folder) error
	// UpdateFolder updates an existing folder.
	UpdateFolder(folder *models.Folder, folderId uuid.UUID) error
	// DeleteFolder deletes a folder by its ID.
	DeleteFolder(id uuid.UUID) error

	// Root operations
	GetRoot() (*models.Folder, error)
	// returns root folder with subfolders/files
	GetRootFiles() ([]models.File, error)
	// optional: fetch root files only
	GetRootFolders() ([]models.Folder, error)
	// optional: fetch root subfolders only

}

type FileRepository interface {
	// GetFileByID returns a file by its ID.
	GetFileByID(id uuid.UUID) (*models.File, error)
	// GetAllFiles returns all files.
	GetAllFiles() ([]*models.File, error)
	// CreateFile creates a new file.
	CreateFile(file *models.File) error
	// UpdateFile updates an existing file.
	UpdateFile(fileID uuid.UUID, newFile models.File) error
	// DeleteFile deletes a file by its ID.
	DeleteFile(id uuid.UUID) error
}

type AdminRepository interface {
	// GetAdminByID returns an admin by its ID.
	GetAdminByID(id uuid.UUID) (*models.Admin, error)
	// GetAdminByUsername returns an admin by its username.
	GetAdminByUsername(username string) (*models.Admin, error)
	// CreateAdmin creates a new admin.
	CreateAdmin(admin *models.Admin) error
	// UpdateAdmin updates an existing admin.
	UpdateAdmin(admin *models.Admin) error
	// DeleteAdmin deletes an admin by its username.
	DeleteAdminByUsername(username string) error
}
