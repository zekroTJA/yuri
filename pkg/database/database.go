package database

import (
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
