package storage

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/Mo7sen007/LocalDrop/internal/paths"
	"github.com/Mo7sen007/LocalDrop/internal/services/serverlog"
	_ "modernc.org/sqlite"
)

func Init() (*sql.DB, error) {
	var rootFolderID = "00000000-0000-0000-0000-000000000000"
	var err error
	dbPath, err := paths.GetFilesPath()
	if err != nil {
		return nil, fmt.Errorf("failed to get db path: %w", err)
	}
	dbPath += "localdrop.db"

	dsn := dbPath + "?_foreign_keys=on"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db.SetMaxOpenConns(1)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	serverlog.Infof("SQLite database initialized: %s", dbPath)

	if err := createTables(db, rootFolderID); err != nil {
		return nil, fmt.Errorf("failed to set up tables: %w", err)
	}
	return db, nil
}

func createTables(db *sql.DB, rootFolderID string) error {
	query := `
    CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
		path TEXT NOT NULL UNIQUE,
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
        pin TEXT,
        mod_time DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE
    );
	CREATE TABLE IF NOT EXISTS admins(
		user_name TEXT PRIMARY KEY NOT NULL,
		id TEXT NOT NULL,
		password TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`
	_, err := db.Exec(query)
	if err != nil {
		return err
	}
	rootPath, err := paths.GetFilesPath()
	rootPath += "Root"
	if err != nil {
		return err
	}
	insertRootQuery := `INSERT INTO folders (id, name, pin_code, path) VALUES (?, 'Root', NULL,?) ON CONFLICT(id) DO NOTHING;`
	_, err = db.Exec(insertRootQuery, rootFolderID, rootPath)
	if err != nil {
		return err
	}

	return nil
}
