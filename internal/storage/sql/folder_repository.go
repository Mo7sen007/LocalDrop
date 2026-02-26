package storage

import (
	"database/sql"
	"os"

	"github.com/Mo7sen007/LocalDrop/internal/models"
	"github.com/google/uuid"
)

func (r *SQLRepository) CreateFolder(folder *models.Folder) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	query := `
        INSERT INTO folders (id, name, path, pin_code, created_at, size, parent_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `

	parentID := r.RootFolderID
	if folder.ParentID != nil {
		parentID = folder.ParentID.String()
	}

	var pin interface{}
	if folder.PinCode != nil {
		pin = *folder.PinCode
	} else {
		pin = nil
	}

	if _, err := tx.Exec(
		query,
		folder.ID.String(),
		folder.Name,
		folder.Path,
		pin,
		folder.CreatedAt,
		folder.Size,
		parentID,
	); err != nil {
		return err
	}

	return tx.Commit()
}

func (r *SQLRepository) UpdateFolder(newFolder *models.Folder, folderID uuid.UUID) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	query := `
        UPDATE folders
        SET name = ?, path = ?, pin_code = ?, created_at = ?, size = ?, parent_id = ?
        WHERE id = ?
    `

	parentID := r.RootFolderID
	if newFolder.ParentID != nil {
		parentID = newFolder.ParentID.String()
	}

	var pin interface{}
	if newFolder.PinCode != nil {
		pin = *newFolder.PinCode
	} else {
		pin = nil
	}

	if _, err := tx.Exec(
		query,
		newFolder.Name,
		newFolder.Path,
		pin,
		newFolder.CreatedAt,
		newFolder.Size,
		parentID,
		folderID.String(),
	); err != nil {
		return err
	}

	return tx.Commit()
}

func (r *SQLRepository) GetFolderByNameAndParent(name string, parentID *uuid.UUID) (*models.Folder, error) {
	var folder models.Folder
	var pinCode sql.NullString
	var parentIDStr sql.NullString

	query := `SELECT id, name, path, pin_code, created_at, size, parent_id FROM folders WHERE name = ? AND `
	var args []interface{}
	args = append(args, name)

	if parentID == nil {

		query += `parent_id = ?`
		args = append(args, r.RootFolderID)
	} else {
		query += `parent_id = ?`
		args = append(args, parentID.String())
	}

	err := r.db.QueryRow(query, args...).Scan(
		&folder.ID, &folder.Name, &folder.Path, &pinCode, &folder.CreatedAt, &folder.Size, &parentIDStr,
	)
	if err != nil {
		return nil, err
	}

	if parentIDStr.Valid {
		parsedID := uuid.MustParse(parentIDStr.String)
		folder.ParentID = &parsedID
	}
	if pinCode.Valid {
		folder.PinCode = &pinCode.String
	}

	return &folder, nil
}

func (r *SQLRepository) GetFolderByID(folderId uuid.UUID) (*models.Folder, error) {
	var folder models.Folder
	var parentIDStr sql.NullString
	var pinCode sql.NullString

	query := `SELECT id, name, path, pin_code, created_at, size, parent_id FROM folders WHERE id = ?`

	err := r.db.QueryRow(query, folderId.String()).Scan(
		&folder.ID, &folder.Name, &folder.Path, &pinCode, &folder.CreatedAt, &folder.Size, &parentIDStr,
	)
	if err != nil {
		return nil, err
	}

	if parentIDStr.Valid {
		parsedID := uuid.MustParse(parentIDStr.String)
		folder.ParentID = &parsedID
	}
	if pinCode.Valid {
		folder.PinCode = &pinCode.String
	}

	subFoldersPtr, err := r.GetSubFolders(folderId)
	if err != nil {
		return nil, err
	}
	subFolders := make([]models.Folder, 0, len(subFoldersPtr))
	for _, sf := range subFoldersPtr {
		if sf != nil {
			subFolders = append(subFolders, *sf)
		}
	}
	folder.SubFolder = subFolders

	folder.Files, err = r.getFolderFiles(folderId)
	if err != nil {
		return nil, err
	}
	folder.Files, err = r.getFolderFiles(folderId)
	if err != nil {
		return nil, err
	}

	return &folder, nil
}

func (r *SQLRepository) DeleteFolder(folderId uuid.UUID) error {
	// delete sub-content explicitly to avoid leftover rows when FK enforcement is off
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var folderPath string
	if err := tx.QueryRow("SELECT path FROM folders WHERE id = ?", folderId.String()).Scan(&folderPath); err != nil {
		return err
	}

	pathPrefix := folderPath + string(os.PathSeparator) + "%"

	if _, err := tx.Exec("DELETE FROM files WHERE path LIKE ?", pathPrefix); err != nil {
		return err
	}

	if _, err := tx.Exec("DELETE FROM folders WHERE path LIKE ? OR id = ?", pathPrefix, folderId.String()); err != nil {
		return err
	}

	return tx.Commit()
}

// Helper to get subfolders
func (r *SQLRepository) GetSubFolders(parentID uuid.UUID) ([]*models.Folder, error) {
	rows, err := r.db.Query(`SELECT id, name, path, pin_code, created_at, size FROM folders WHERE parent_id = ?`, parentID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []*models.Folder
	for rows.Next() {
		var folder models.Folder
		var pinCode sql.NullString
		if err := rows.Scan(&folder.ID, &folder.Name, &folder.Path, &pinCode, &folder.CreatedAt, &folder.Size); err != nil {
			return nil, err
		}
		if pinCode.Valid {
			folder.PinCode = &pinCode.String
		}
		folders = append(folders, &folder)
	}
	return folders, nil
}

// Helper to get files in a folder
func (r *SQLRepository) getFolderFiles(folderID uuid.UUID) ([]models.File, error) {
	rows, err := r.db.Query(`
        SELECT id, folder_id, name, path, size, extension, mimetype, pin, mod_time, created_at 
        FROM files WHERE folder_id = ?`, folderID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []models.File
	for rows.Next() {
		var file models.File
		var folderIDStr sql.NullString
		var pin sql.NullString
		if err := rows.Scan(&file.ID, &folderIDStr, &file.Name, &file.Path, &file.Size, &file.Extension, &file.MIMEType, &pin, &file.ModTime, &file.CreatedAt); err != nil {
			return nil, err
		}
		if folderIDStr.Valid {
			parsedID := uuid.MustParse(folderIDStr.String)
			file.FolderID = &parsedID
		}
		if pin.Valid {
			file.Pin = &pin.String
		}
		files = append(files, file)
	}
	return files, nil
}

//Root folder operations

func (r *SQLRepository) GetRootFolders() ([]models.Folder, error) {
	rows, err := r.db.Query(`SELECT id, name, path, pin_code, created_at, size FROM folders WHERE parent_id = ?`, r.RootFolderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []models.Folder
	for rows.Next() {
		var folder models.Folder
		var pinCode sql.NullString
		if err := rows.Scan(&folder.ID, &folder.Name, &folder.Path, &pinCode, &folder.CreatedAt, &folder.Size); err != nil {
			return nil, err
		}
		if pinCode.Valid {
			folder.PinCode = &pinCode.String
		}
		folders = append(folders, folder)
	}
	return folders, nil
}

func (r *SQLRepository) GetRootFiles() ([]models.File, error) {
	rows, err := r.db.Query(`
        SELECT id, folder_id, name, path, size, extension, mimetype, pin, mod_time, created_at 
        FROM files WHERE folder_id = ?`, r.RootFolderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []models.File
	for rows.Next() {
		var file models.File
		var folderIDStr sql.NullString
		var pin sql.NullString
		if err := rows.Scan(&file.ID, &folderIDStr, &file.Name, &file.Path, &file.Size, &file.Extension, &file.MIMEType, &pin, &file.ModTime, &file.CreatedAt); err != nil {
			return nil, err
		}
		if folderIDStr.Valid {
			parsedID := uuid.MustParse(folderIDStr.String)
			file.FolderID = &parsedID
		}
		if pin.Valid {
			file.Pin = &pin.String
		}
		files = append(files, file)
	}
	return files, nil
}

func (r *SQLRepository) GetRoot() (*models.Folder, error) {
	subFolders, err := r.GetRootFolders()
	if err != nil {
		return nil, err
	}

	files, err := r.GetRootFiles()
	if err != nil {
		return nil, err
	}

	rootID := uuid.MustParse(r.RootFolderID)

	var rootPath string
	err = r.db.QueryRow(`SELECT path FROM folders WHERE id = ?`, r.RootFolderID).Scan(&rootPath)
	if err != nil {
		return nil, err
	}

	return &models.Folder{
		ID:        rootID,
		Name:      "Root",
		Path:      rootPath,
		SubFolder: subFolders,
		Files:     files,
	}, nil
}
