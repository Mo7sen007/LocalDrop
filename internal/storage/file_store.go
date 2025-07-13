package storage

import (
	"encoding/json"
	"fileshare/internal/models"
	"fmt"
	"io"
	"os"
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

func UpdateFiles(files []models.File) error {

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
