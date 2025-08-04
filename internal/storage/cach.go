package storage

import "github.com/Mo7sen007/LocalDrop/internal/models"

var List []models.File

func InitializeListOfFiles() (*[]models.File, error) {
	err := models.GetInitialListOfFiles(&List)
	if err != nil {
		return nil, err
	}
	return &List, nil
}
