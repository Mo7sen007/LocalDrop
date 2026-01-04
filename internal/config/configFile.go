package config

import (
	"log"
	"os"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"gopkg.in/yaml.v3"
)

func GetConfig() (models.Config, error) {
	configPath, err := paths.GetConfigPath()
	if err != nil {
		log.Printf("Couldn't get config file path, error:%v", err)
		return models.Config{}, err
	}
	data, err := os.ReadFile(configPath)
	if err != nil {
		log.Printf("Couldn't read config file , error:%v", err)
		return models.Config{}, err
	}
	var Config models.Config

	err = yaml.Unmarshal(data, &Config)
	if err != nil {
		log.Printf("Couldn't parse config file , error:%v", err)
		return models.Config{}, err
	}
	return Config, nil

}
