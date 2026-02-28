package services

import (
	"github.com/Mo7sen007/LocalDrop/internal/models"
)

type UploadJobService struct {
	fileService   *FileService
	folderService *FolderService
	JobManager    *models.JobManager
}

func NewUploadJobService(fileService *FileService, folderService *FolderService, workers int) *UploadJobService {
	return &UploadJobService{
		fileService:   fileService,
		folderService: folderService,
		JobManager:    models.NewJobManager(workers),
	}
}
