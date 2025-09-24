package storage

import (
	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/google/uuid"
)

var List = make(map[uuid.UUID]models.File)

func InitializeListOfFiles() (map[uuid.UUID]models.File, error) {
	err := models.GetInitialListOfFiles(List)
	if err != nil {
		return nil, err
	}
	UpdateFiles(List)
	return List, nil
}
