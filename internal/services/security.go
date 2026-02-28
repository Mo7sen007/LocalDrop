package services

import (
	"crypto/rand"
	"fmt"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	cost := bcrypt.DefaultCost

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), cost)

	if err != nil {
		return "", err
	}
	return string(hashedPassword), nil
}

func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))

	return err == nil
}

func SetupTLS(config *models.Config) (certFile, keyFile string, err error) {
	if config.TLS.Enabled {
		if config.TLS.CertFile == "" || config.TLS.KeyFile == "" {
			return "", "", fmt.Errorf("TLS is enabled but cert_file or key_file is not specified")
		}

		return config.TLS.CertFile, config.TLS.KeyFile, nil
	}
	return "", "", nil
}

func GenerateRandomKey(length int) ([]byte, error) {
	key := make([]byte, length)
	_, err := rand.Read(key)
	if err != nil {
		return nil, fmt.Errorf("failed to generate random key: %w", err)
	}
	return key, nil
}

func GenerateSessionKey() ([]byte, error) {
	return GenerateRandomKey(32)
}
