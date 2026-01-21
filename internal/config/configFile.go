package config

import (
	"os"
	"path/filepath"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/services/serverlog"
	"gopkg.in/yaml.v3"
)

func GetConfig() (models.Config, error) {
	configPath, err := paths.GetConfigPath()
	if err != nil {
		serverlog.Errorf("Couldn't get config file path, error:%v", err)
		return models.Config{}, err
	}
	data, err := os.ReadFile(configPath)
	if err != nil {

		if os.IsNotExist(err) {
			serverlog.Warnf("Config file not found, creating default at %s", configPath)

			filesPath, pErr := paths.GetFilesPath()
			if pErr != nil {
				serverlog.Warnf("Couldn't determine files path, falling back to current dir: %v", pErr)
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
				serverlog.Errorf("Failed to save default config: %v", err)
				return models.Config{}, err
			}
			return defaultConfig, nil
		}

		serverlog.Errorf("Couldn't read config file , error:%v", err)
		return models.Config{}, err
	}
	var Config models.Config

	err = yaml.Unmarshal(data, &Config)
	if err != nil {
		serverlog.Errorf("Couldn't parse config file , error:%v", err)
		return models.Config{}, err
	}
	return Config, nil

}

func SaveConfig(c *models.Config) error {
	configPath, err := paths.GetConfigPath()
	if err != nil {
		serverlog.Errorf("Couldn't get config file path, error:%v", err)
		return err
	}

	if err := os.MkdirAll(filepath.Dir(configPath), 0o775); err != nil {
		return err
	}

	data, err := yaml.Marshal(c)
	if err != nil {
		return err
	}

	tmpPath := configPath + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0o664); err != nil {
		return err
	}

	return os.Rename(tmpPath, configPath)
}
