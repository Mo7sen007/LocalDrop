package services

import (
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"

	"github.com/Mo7sen007/LocalDrop/internal/config"
	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/services/serverlog"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
	"github.com/google/uuid"
)

func GetAllFiles() []models.File {
	files, err := storage.GetAllFiles()
	if err != nil {
		return []models.File{}
	}
	return files
}

func GetFileByID(id uuid.UUID) (*models.File, bool) {
	file, err := storage.GetFile(id)
	if err != nil {
		return nil, false
	}
	return file, true
}

func HasPinCode(file *models.File) bool {
	return file.Pin != nil && *file.Pin != ""
}

func DeleteFiles(files []models.File) error {
	for _, file := range files {
		err := os.Remove(file.Path)
		if err != nil {
			return err
		}
	}
	return nil
}

func getMaxUploadSize() int64 {
	cfg, cfgErr := config.GetConfig()
	if cfgErr == nil {
		return cfg.Storage.MaxFileSize
	}
	serverlog.Warnf("could not load config for size limit: %v", cfgErr)
	return 0
}

// SaveUploadedFile writes the multipart upload to disk (atomic via temp file + rename).
// Kept for compatibility, but consider calling SaveUploadedFileAndCreateRecord for the full flow.
func SaveUploadedFile(file *multipart.FileHeader, dstPath string) error {
	return saveMultipartToPath(file, dstPath, getMaxUploadSize())
}

// SaveFile persists metadata for a file that already exists on disk.
// Kept for compatibility; consider renaming callers to SaveFileMetadata.
func SaveFile(filename string, diskPath string, pinCode string, folderID *uuid.UUID) error {
	return saveFileMetadata(filename, diskPath, pinCode, folderID, getMaxUploadSize())
}

// SaveUploadedFileAndCreateRecord is the "one call" upload flow:
// 1) write to disk, 2) persist DB record, 3) cleanup disk file if DB step fails.
func SaveUploadedFileAndCreateRecord(fileHeader *multipart.FileHeader, diskPath string, pinCode string, folderID *uuid.UUID, displayName string) error {
	maxSize := getMaxUploadSize()

	if err := saveMultipartToPath(fileHeader, diskPath, maxSize); err != nil {
		return err
	}

	finalName := fileHeader.Filename
	if displayName != "" {
		finalName = displayName
		if filepath.Ext(finalName) == "" {
			finalName = finalName + filepath.Ext(fileHeader.Filename)
		}
	}

	if err := saveFileMetadata(finalName, diskPath, pinCode, folderID, maxSize); err != nil {
		_ = os.Remove(diskPath)
		return err
	}
	return nil
}

func saveFileMetadata(filename string, diskPath string, pinCode string, folderID *uuid.UUID, maxSize int64) error {
	info, err := os.Stat(diskPath)
	if err != nil {
		_ = os.Remove(diskPath)
		return fmt.Errorf("could not stat saved file: %w", err)
	}

	if maxSize > 0 && info.Size() > maxSize {
		_ = os.Remove(diskPath)
		return fmt.Errorf("file size %d exceeds allowed maximum %d", info.Size(), maxSize)
	}

	extension := filepath.Ext(filename)

	var pinPtr *string
	if pinCode != "" {
		pinPtr = &pinCode
	}

	uploadedFile := models.File{
		ID:        uuid.New(),
		FolderID:  folderID,
		Name:      filename,
		Path:      diskPath,
		Pin:       pinPtr,
		Size:      info.Size(),
		Extension: extension,
		MIMEType:  mime.TypeByExtension(extension),
		ModTime:   time.Now(),
		CreatedAt: time.Now(),
	}

	if err := storage.CreateFile(&uploadedFile); err != nil {
		_ = os.Remove(diskPath)
		serverlog.Errorf("Failed to save file metadata to database: %v", err)
		return fmt.Errorf("could not save file to database: %w", err)
	}

	serverlog.Infof("Successfully uploaded file: %s (ID: %s, Size: %d bytes)",
		filename, uploadedFile.ID.String(), uploadedFile.Size)

	return nil
}

func saveMultipartToPath(file *multipart.FileHeader, dstPath string, maxSize int64) error {
	if err := os.MkdirAll(filepath.Dir(dstPath), 0755); err != nil {
		return err
	}

	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	tmp, err := os.CreateTemp(filepath.Dir(dstPath), ".upload-*")
	if err != nil {
		return err
	}

	tmpName := tmp.Name()
	defer func() {
		_ = tmp.Close()
	}()

	var written int64
	if maxSize > 0 {
		limited := io.LimitReader(src, maxSize+1)
		written, err = io.Copy(tmp, limited)
	} else {
		written, err = io.Copy(tmp, src)
	}
	if err != nil {
		_ = os.Remove(tmpName)
		return err
	}
	if maxSize > 0 && written > maxSize {
		_ = os.Remove(tmpName)
		return fmt.Errorf("uploaded file too large: %d bytes (max %d)", written, maxSize)
	}

	if err := tmp.Close(); err != nil {
		_ = os.Remove(tmpName)
		return err
	}

	if err := os.Rename(tmpName, dstPath); err != nil {
		_ = os.Remove(tmpName)
		return err
	}

	if err := os.Chmod(dstPath, 0644); err != nil {
		_ = os.Remove(dstPath)
		return err
	}

	return nil
}
