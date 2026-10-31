package database

import (
	"context"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Database struct {
	db *gorm.DB
}

func New(dsn string) (*Database, error) {
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, err
	}

	if err = db.AutoMigrate(models...); err != nil {
		return nil, err
	}

	if err = lowercaseTags(db); err != nil {
		return nil, err
	}

	t := &Database{
		db: db,
	}

	return t, nil
}

// Transaction runs fn within a database transaction, passing it a
// Database instance scoped to that transaction. If fn returns an
// error, the transaction is rolled back.
func (t *Database) Transaction(fn func(tx *Database) error) error {
	return t.db.Transaction(func(gormTx *gorm.DB) error {
		return fn(&Database{db: gormTx})
	})
}

// Ping checks whether the underlying database connection is alive.
func (t *Database) Ping(ctx context.Context) error {
	sqlDB, err := t.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.PingContext(ctx)
}

func (t *Database) Db() *gorm.DB {
	return t.db
}

// lowercaseTags converts all stored sound tags and channel tag blocklists to
// lowercase, because tags are expected to be lowercase everywhere. Tags are
// stored as JSON arrays of strings, so lowercasing the serialized value only
// affects the tags themselves.
func lowercaseTags(db *gorm.DB) error {
	err := db.Exec("UPDATE sounds SET tags = LOWER(tags) WHERE tags <> LOWER(tags)").Error
	if err != nil {
		return err
	}
	return db.Exec("UPDATE channels SET tag_blocklist = LOWER(tag_blocklist) WHERE tag_blocklist <> LOWER(tag_blocklist)").Error
}
