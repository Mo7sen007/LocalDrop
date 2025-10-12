package storage

import (
	"encoding/json"
	"fmt"
	"io"
	"os"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/google/uuid"
)

func LoadFiles() (map[uuid.UUID]models.File, error) {
	filesMap := make(map[uuid.UUID]models.File)

	jsonPath, err := paths.GetJsonFilePath()
	if err != nil {
		return nil, fmt.Errorf("error setting up: %v", err)
	}
	jsonFile, err := os.Open(jsonPath)

	if err != nil {
		return nil, fmt.Errorf("error opening json file: %v", err)
	}
	defer jsonFile.Close()
	bytes, err := io.ReadAll(jsonFile)
	if err != nil {
		return nil, fmt.Errorf("error reading json file :%v ", err)
	}
	if err := json.Unmarshal(bytes, &filesMap); err != nil {
		return nil, fmt.Errorf("error unmarshaling json: %v", err)
	}

	return filesMap, nil

}

func UpdateFiles(files map[uuid.UUID]models.File) error {

	List = files
	jsonPath, err := paths.GetJsonFilePath()
	if err != nil {
		return fmt.Errorf("error setting up: %v", err)
	}

	jsonFile, err := os.Create(jsonPath)
	if err != nil {
		return fmt.Errorf("error opening json file for writing: %v", err)
	}
	defer jsonFile.Close()

	encoder := json.NewEncoder(jsonFile)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(files); err != nil {
		return fmt.Errorf("error encoding json: %v", err)
	}
	return nil
}
