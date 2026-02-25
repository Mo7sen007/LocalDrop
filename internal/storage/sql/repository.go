package storage

import "database/sql"

type SQLRepository struct {
	db           *sql.DB
	RootFolderID string
}

func NewSQLRepository(db *sql.DB) *SQLRepository {
	return &SQLRepository{db: db, RootFolderID: "00000000-0000-0000-0000-000000000000"}
}
func (r *SQLRepository) Close() error {
	if r.db != nil {
		return r.db.Close()
	}
	return nil
}

func (r *SQLRepository) GetDB() *sql.DB {
	return r.db
}
