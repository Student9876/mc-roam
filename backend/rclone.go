package backend

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"syscall" // Required for hiding the window
)

// SyncDirection defines if we are Pulling (Down) or Pushing (Up)
type SyncDirection string

const (
	SyncDown SyncDirection = "down" // Cloud -> Local
	SyncUp   SyncDirection = "up"   // Local -> Cloud
)

// RunSync executes the Rclone command and streams output to UI
func (a *App) RunSync(direction SyncDirection, remotePath string, localPath string) error {
	// 1. Where is the rclone executable?
	rcloneBin := "./rclone.exe"

	// 2. Define source and destination
	var source, dest string
	remoteName := "mc-remote:" + remotePath

	if direction == SyncDown {
		source = remoteName
		dest = localPath
	} else {
		source = localPath
		dest = remoteName
	}

	a.Log(fmt.Sprintf("🔄 Syncing (%s)...", direction))

	// 3. The Command
	args := []string{
		"sync", source, dest,
		"--progress",
		"--transfers", "8", // Speed up small file transfers
		"--create-empty-src-dirs",
		"--config", "./rclone.conf",
		"--exclude", "session.lock",
		"--exclude", "logs/**", // Skip logs
		"--exclude", "cache/**", // Skip cache
		"--exclude", "libraries/**", // Skip libraries
		"--exclude", "versions/**", // Skip version data
		"--exclude", "crash-reports/**", // Skip crash reports
	}

	cmd := exec.Command(rcloneBin, args...)

	// Windows-specific: Hide the flashing console window
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	// 4. CAPTURE OUTPUT
	// We combine Stdout and Stderr to catch both progress and errors
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	cmd.Stderr = cmd.Stdout

	// 5. Start
	if err := cmd.Start(); err != nil {
		return err
	}

	// 6. Stream Logs to UI (Line by Line)
	// This makes the "Transferring..." lines appear in your black terminal box
	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		text := scanner.Text()
		// Optional: Filter out super noisy lines if you want,
		// but for now, seeing the progress is satisfying.
		a.Log("[Sync]: " + text)
	}

	// 7. Wait for finish
	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("sync failed: %w", err)
	}

	return nil
}

// EnsureLocalFolder makes sure the 'world' folder exists before we try to sync to it
func EnsureLocalFolder(path string) {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		os.MkdirAll(path, 0755)
	}
}

// PurgeRemote completely deletes a folder from the cloud
func (a *App) PurgeRemote(remotePath string) error {
	// rclone purge mc-remote:server-srv_123 ...
	remoteName := "mc-remote:" + remotePath
	a.Log(fmt.Sprintf("🔥 Deleting Cloud Data: %s", remoteName))

	args := []string{
		"purge", remoteName,
		"--config", "./rclone.conf",
	}

	cmd := exec.Command("./rclone.exe", args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	// We don't need to stream logs for this, just run it
	return cmd.Run()
}
