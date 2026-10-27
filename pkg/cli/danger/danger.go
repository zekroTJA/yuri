package danger

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/zekrotja/yuri/pkg/cli/cliutil"
	"github.com/zekrotja/yuri/pkg/database"
	"gorm.io/gorm"
)

type Command struct {
	PruneSounds *pruneSounds `arg:"subcommand:prune-sounds" help:"Prune all sound files and database entries"`

	db *database.Database
}

func (t *Command) Run(db *database.Database) error {
	t.db = db

	switch {
	case t.PruneSounds != nil:
		return t.pruneSounds(t.PruneSounds.Yes, t.PruneSounds.StorageDir)
	}

	return errors.New("no command provided")
}

type pruneSounds struct {
	Yes        bool   `arg:"-y,--yes" help:"Perform without confirmation"`
	StorageDir string `arg:"-d,--storage-dir,env:YURI_STORAGE_DIR,required" help:"Sound files directory"`
}

func (t *Command) pruneSounds(yes bool, storageDir string) (err error) {
	if !yes {
		yes, err = cliutil.Confirm("Do you really want to delete all sounds, sound database entries and sound statistics?")
		if err != nil {
			return err
		}
	}
	if !yes {
		fmt.Println("Aborted.")
		return nil
	}

	fmt.Println("Deleting sound database entries and sound statistics ...")
	err = t.db.Db().Transaction(func(tx *gorm.DB) error {
		tx = tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped()

		if err := tx.Delete(&database.SoundPlay{}).Error; err != nil {
			return fmt.Errorf("failed deleting sound statistics: %w", err)
		}

		if err := tx.Delete(&database.Sound{}).Error; err != nil {
			return fmt.Errorf("failed deleting sound database entries: %w", err)
		}

		return nil
	})
	if err != nil {
		return err
	}

	fmt.Println("Deleting sound files ...")
	if err = removeContents(storageDir); err != nil {
		return fmt.Errorf("failed deleting storage dir: %s", err.Error())
	}

	fmt.Println("Done.")

	return nil
}

func removeContents(dir string) error {
	d, err := os.Open(dir)
	if err != nil {
		return err
	}
	defer d.Close()
	names, err := d.Readdirnames(-1)
	if err != nil {
		return err
	}
	for _, name := range names {
		err = os.RemoveAll(filepath.Join(dir, name))
		if err != nil {
			return err
		}
	}
	return nil
}
