package storage

import (
	"github.com/Mo7sen007/LocalDrop/internal/models"
	storagesql "github.com/Mo7sen007/LocalDrop/internal/storage/sql"
)

// Init initializes the storage backend and ensures the database is ready.
func Init() error {
	db, err := storagesql.Init()
	if err != nil {
		return err
	}
	return db.Close()
}

// CreateAdmin is a compatibility wrapper that uses the SQL repository.
func CreateAdmin(admin *models.Admin) error {
	db, err := storagesql.Init()
	if err != nil {
		return err
	}
	defer db.Close()

	repo := storagesql.NewSQLRepository(db)
	return repo.CreateAdmin(admin)
}

// GetAllAdmins is a compatibility wrapper that uses the SQL repository.
func GetAllAdmins() ([]models.Admin, error) {
	db, err := storagesql.Init()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	repo := storagesql.NewSQLRepository(db)
	return repo.GetAllAdmins()
}
