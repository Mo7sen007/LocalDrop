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

		if os.IsNotExist(err) {
			log.Printf("Config file not found, creating default at %s", configPath)

			filesPath, pErr := paths.GetFilesPath()
			if pErr != nil {
				log.Printf("Couldn't determine files path, falling back to current dir: %v", pErr)
				filesPath = "./"
			}

			defaultConfig := models.Config{
				App:     models.NewAppConfig(8080),
				Storage: models.NewStorageConfig(filesPath, 100<<20),
				Auth:    models.NewAuthConfig(false),
				Logging: models.NewLoggingConfig(true, "info"),
			}

			err = SaveConfig(&defaultConfig)
			if err != nil {
				log.Printf("Failed to save default config: %v", err)
				return models.Config{}, err
			}
			return defaultConfig, nil
		}

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

func SaveConfig(c *models.Config) error {
	configPath, err := paths.GetConfigPath()
	if err != nil {
		log.Printf("Couldn't get config file path, error:%v", err)
		return err
	}
	data, err := yaml.Marshal(&c)
	if err != nil {
		return err
	}
	err = os.WriteFile(configPath, data, 0664)
	if err != nil {
		return err
	}
	return nil
}
