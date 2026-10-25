package cli

import (
	"fmt"

	"github.com/alexflint/go-arg"
	"github.com/zekrotja/yuri/pkg/cli/users"
	"github.com/zekrotja/yuri/pkg/database"
)

type Args struct {
	DatabaseDsn string `arg:"-d,--database,env:YURI_DATABASE_DSN" default:"database.sqlite3" help:"Database DSN"`

	Users *users.Command `arg:"subcommand" help:"Manage users"`
}

func Run() error {
	var args Args
	arg.MustParse(&args)

	db, err := database.New(args.DatabaseDsn)
	if err != nil {
		return fmt.Errorf("failed opening database: %s", err.Error())
	}

	switch {
	case args.Users != nil:
		err = args.Users.Run(db)
	}

	if err != nil {
		return fmt.Errorf("command failed: %s", err.Error())
	}

	return nil
}
