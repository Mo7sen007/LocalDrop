package storage

import (
	"encoding/json"
	"fmt"
	"io"
	"os"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/google/uuid"
)

func LoadFiles() ([]models.File, error) {

	jsonFile, err := os.Open("internal\\storage\\listOfFiles.json")
	if err != nil {
		return nil, fmt.Errorf("error opening json file: %v", err)
	}
	defer jsonFile.Close()

	bytes, err := io.ReadAll(jsonFile)
	if err != nil {
		return nil, fmt.Errorf("error reading json file: %v", err)
	}

	var list []models.File
	if err := json.Unmarshal(bytes, &list); err != nil {
		return nil, fmt.Errorf("error unmarshaling json: %v", err)
	}
	List = list

	return list, nil
}

func TempLoadFiles() (map[uuid.UUID]models.File, error) {
	filesMap := make(map[uuid.UUID]models.File)
	jsonFile, err := os.Open("internal\\storage\\listOfFiles.json")

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

func TempUpdateFiles(files map[uuid.UUID]models.File) error {
	List = files

}

func UpdateFiles(files map[uuid.UUID]models.File) error {

	List = files

	jsonFile, err := os.Create("internal\\storage\\listOfFiles.json")
	if err != nil {
		fmt.Print("error here!")
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
