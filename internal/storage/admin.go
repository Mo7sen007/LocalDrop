package storage

import (
	"encoding/json"
	"fmt"
	"io"
	"os"

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
	list, err := LoadAdminList(path)

	if err != nil {
		return fmt.Errorf("couldn't load list:%w", err)
	}
	list = append(list, newAdmin)

	jsonFile, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("error opening json file for writing: %v", err)
	}

	defer jsonFile.Close()

	encoder := json.NewEncoder(jsonFile)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(list); err != nil {
		return fmt.Errorf("error encoding json: %v", err)
	}
	return nil
}
