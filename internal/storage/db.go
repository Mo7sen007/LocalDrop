package storage

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func Init(dbPath string) error {
	var err error

	dsn := dbPath + "?_foreign_keys=on"
	DB, err = sql.Open("sqlite3", dsn)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	DB.SetMaxOpenConns(1)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := DB.PingContext(ctx); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("SQLite database initialized:", dbPath)

	if err := createTables(); err != nil {
		return fmt.Errorf("failed to set up tables: %w", err)
	}
	return nil
}

func createTables() error {
	const rootFolderID = "00000000-0000-0000-0000-000000000000"
	query := `
    CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        pin_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        size INTEGER DEFAULT 0,
        parent_id TEXT,
        FOREIGN KEY(parent_id) REFERENCES folders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        folder_id TEXT,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        size INTEGER NOT NULL,
        extension TEXT,
        mimetype TEXT,
        mod_time DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE
    );`
	_, err := DB.Exec(query)
	if err != nil {
		return err
	}
	insertRootQuery := `INSERT INTO folders (id, name, pin_code) VALUES (?, 'Root', NULL) ON CONFLICT(id) DO NOTHING;`
	_, err = DB.Exec(insertRootQuery, rootFolderID)
	if err != nil {
		return err
	}

	return nil
}
