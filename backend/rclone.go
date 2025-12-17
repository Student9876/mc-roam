package backend

import (
	"fmt"
	"os"
	"os/exec"
	// "path/filepath"
)

// SyncDirection defines if we are Pulling (Down) or Pushing (Up)
type SyncDirection string

const (
	SyncDown SyncDirection = "down" // Cloud -> Local
	SyncUp   SyncDirection = "up"   // Local -> Cloud
)

// RunSync executes the Rclone command
func (a *App) RunSync(direction SyncDirection, remotePath string, localPath string) error {
	// 1. Where is the rclone executable?
	// In production, this might be in a resource folder. For now, it's in the current dir.
	rcloneBin := "./rclone.exe"

	// 2. Define source and destination
	var source, dest string

	// For this test, we are using a temporary "Remote" name called 'mc-remote'
	// We assume the user has ALREADY run 'rclone config' manually for this step.
	// Later, we will automate the config injection.
	remoteName := "mc-remote:" + remotePath

	if direction == SyncDown {
		source = remoteName
		dest = localPath
	} else {
		source = localPath
		dest = remoteName
	}

	fmt.Printf("🔄 Syncing (%s): %s -> %s\n", direction, source, dest)

	// 3. The Command: Add --config flag
	// This forces Rclone to use the credentials we just injected
	cmd := exec.Command(rcloneBin,
		"sync", source, dest,
		"--progress",
		"--create-empty-src-dirs",
		"--config", "./rclone.conf",
	)

	// Connect output to console so we can see what's happening in VS Code terminal
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

// EnsureLocalFolder makes sure the 'world' folder exists before we try to sync to it
func EnsureLocalFolder(path string) {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		os.MkdirAll(path, 0755)
	}
}
