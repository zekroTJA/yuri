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
