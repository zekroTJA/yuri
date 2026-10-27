package users

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"syscall"
	"text/tabwriter"
	"time"

	"github.com/alexedwards/argon2id"
	"github.com/zekrotja/yuri/pkg/cli/cliutil"
	"github.com/zekrotja/yuri/pkg/database"
	"github.com/zekrotja/yuri/pkg/util"
	"golang.org/x/term"
)

const (
	passwordLength  = 16
	passwordCharset = util.DefaultCharset
)

type Command struct {
	Create *commandCreate `arg:"subcommand" help:"Create a new user"`
	List   *commandList   `arg:"subcommand" help:"List all users"`
	Delete *commandDelete `arg:"subcommand" help:"Delete a user"`

	db *database.Database
}

type commandCreate struct {
	Username     string `arg:"positional,required" help:"Username of the user"`
	Password     string `arg:"--password" help:"Pass password for the user"`
	ReadPassword bool   `arg:"-p,--read-password" help:"Read password from stdin"`
}

type commandList struct{}

type commandDelete struct {
	Username string `arg:"positional,required" help:"Username of the user"`
	Yes      bool   `arg:"-y,--yes" help:"Skip the confirmation prompt"`
}

func (t *Command) Run(db *database.Database) error {
	t.db = db

	switch {
	case t.Create != nil:
		return t.createUser()
	case t.List != nil:
		return t.listUsers()
	case t.Delete != nil:
		return t.deleteUser()
	}

	return errors.New("no command provided")
}

func (t *Command) createUser() (err error) {
	handle := strings.ToLower(t.Create.Username)

	user, err := t.db.GetUserByHandle(handle)
	if err != nil {
		return fmt.Errorf("failed to check users in database: %s", err.Error())
	}
	if user != nil {
		return fmt.Errorf("user with given handle already exists")
	}

	var (
		password     string
		showPassword bool
	)

	if t.Create.ReadPassword || t.Create.Password == "-" {
		password, err = readSecretStdin()
		if err != nil {
			return fmt.Errorf("failed reading password from stdin: %s", err)
		}
	} else if t.Create.Password != "" {
		password = t.Create.Password
	}

	if password == "" {
		password = util.GenerateRandomString(passwordLength, passwordCharset)
		showPassword = true
	}

	passwordHash, err := argon2id.CreateHash(password, argon2id.DefaultParams)
	if err != nil {
		return fmt.Errorf("failed hashing password: %s", err.Error())
	}

	user, err = t.db.CreateUser(handle, []byte(passwordHash))
	if err != nil {
		return fmt.Errorf("database command failed: %s", err.Error())
	}

	fmt.Print("User has been created.\n\n")
	fmt.Printf("ID:         %d\n", user.ID)
	fmt.Printf("Handle:     %s\n", user.Handle)
	if showPassword {
		fmt.Printf("Password:   %s\n", password)
	}

	return nil
}

func (t *Command) listUsers() error {
	users, err := t.db.ListUsers()
	if err != nil {
		return fmt.Errorf("database command failed: %s", err.Error())
	}

	if len(users) == 0 {
		fmt.Println("No users found.")
		return nil
	}

	tableWriter := tabwriter.NewWriter(os.Stdout, 0, 0, 3, ' ', 0)
	fmt.Fprintln(tableWriter, "ID\tHANDLE\tCREATED")
	for _, user := range users {
		fmt.Fprintf(tableWriter, "%d\t%s\t%s\n", user.ID, user.Handle, user.CreatedAt.Format(time.RFC3339))
	}

	return tableWriter.Flush()
}

func (t *Command) deleteUser() error {
	handle := strings.ToLower(t.Delete.Username)

	user, err := t.db.GetUserByHandle(handle)
	if err != nil {
		return fmt.Errorf("failed to check users in database: %s", err.Error())
	}
	if user == nil {
		return fmt.Errorf("user with given handle does not exist")
	}

	if !t.Delete.Yes {
		confirmed, err := cliutil.Confirm(fmt.Sprintf(
			"Delete user %q (ID %d) including their API keys and owned channels?", user.Handle, user.ID))
		if err != nil {
			return fmt.Errorf("failed reading confirmation: %s", err.Error())
		}
		if !confirmed {
			fmt.Println("Aborted.")
			return nil
		}
	}

	if err = t.db.DeleteUser(user.ID); err != nil {
		return fmt.Errorf("database command failed: %s", err.Error())
	}

	fmt.Println("User has been deleted.")

	return nil
}

func readSecretStdin() (string, error) {
	fmt.Print("Password: ")
	pass, err := term.ReadPassword(int(syscall.Stdin))
	if err != nil {
		return "", err
	}
	return string(pass), nil
}
