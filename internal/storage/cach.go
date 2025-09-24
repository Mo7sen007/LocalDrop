package storage

import (
	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/google/uuid"
)

var List map[uuid.UUID]models.File

func InitializeListOfFiles() (*[]models.File, error) {
	err := models.GetInitialListOfFiles(&List)
	if err != nil {
		return nil, err
	}
	return &List, nil
}
