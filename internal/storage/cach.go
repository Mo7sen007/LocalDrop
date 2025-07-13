package storage

import "fileshare/internal/models"

var List []models.File

func InitializeListOfFiles() (*[]models.File, error) {
	err := models.GetInitialListOfFiles(&List)
	if err != nil {
		return nil, err
	}
	return &List, nil
}
