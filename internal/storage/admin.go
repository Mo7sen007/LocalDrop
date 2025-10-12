package storage

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/Mo7sen007/LocalDrop/internal/models"
)

func LoadAdminList(path string) ([]models.Admin, error) {

	jsonFile, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("error opening json file: %v", err)
	}
	defer jsonFile.Close()

	bytes, err := io.ReadAll(jsonFile)
	if err != nil {
		return nil, fmt.Errorf("error reading json file: %v", err)
	}

	var list []models.Admin
	if err := json.Unmarshal(bytes, &list); err != nil {
		return nil, fmt.Errorf("error unmarshaling json: %v", err)
	}

	return list, nil
}

func UpdateAdmin(newAdmin models.Admin, path string) error {
	var list []models.Admin

	existingList, err := LoadAdminList(path)
	if err != nil {
		list = []models.Admin{}
	} else {
		list = existingList
	}

	list = append(list, newAdmin)

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	jsonFile, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("error opening json file for writing: %w", err)
	}
	defer jsonFile.Close()

	encoder := json.NewEncoder(jsonFile)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(list); err != nil {
		return fmt.Errorf("error encoding json: %w", err)
	}

	return nil
}
