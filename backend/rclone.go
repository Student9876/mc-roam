package backend

import (
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
	rcloneBin := "./rclone.exe"
	var source, dest string
	remoteName := "mc-remote:" + remotePath

	// Prepare user-friendly messages
	var logMsg string
	var statusMsg string

	if direction == SyncDown {
		source = remoteName
		dest = localPath
		logMsg = "⬇️ STARTING DOWNLOAD: Cloud ➔ Local"
		statusMsg = "[Sync]: STATUS: ⬇️ Downloading Server Data... DO NOT CLOSE!"
	} else {
		source = localPath
		dest = remoteName
		logMsg = "☁️ STARTING UPLOAD: Local ➔ Cloud"
		statusMsg = "[Sync]: STATUS: ☁️ Uploading Server Data... DO NOT CLOSE!"
	}

	// 1. Log to Main Terminal (Permanent History)
	a.Log(logMsg)
	a.Log("⚠️ DO NOT CLOSE THE APP OR TURN OFF PC")

	// 2. Trigger Sticky Footer Immediately (Transient Status)
	a.Log(statusMsg)

	// 3. The Command
	args := []string{
		"sync", source, dest,
		"--progress",
		"--transfers", "8",
		"--create-empty-src-dirs",
		"--config", "./rclone.conf",
		"--exclude", "session.lock",
		"--exclude", "logs/**",
		"--exclude", "cache/**",
		"--exclude", "libraries/**",
		"--exclude", "versions/**",
		"--exclude", "crash-reports/**",
	}

	cmd := exec.Command(rcloneBin, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	cmd.Stderr = cmd.Stdout

	if err := cmd.Start(); err != nil {
		return err
	}

	// Read output byte-by-byte to handle carriage returns
	go func() {
		buf := make([]byte, 1)
		line := ""
		for {
			n, err := stdout.Read(buf)
			if n > 0 {
				char := buf[0]
				if char == '\r' {
					// Carriage return - emit current line and reset
					if line != "" {
						a.Log("[Sync]: " + line)
						line = ""
					}
				} else if char == '\n' {
					// Newline - emit line and reset
					if line != "" {
						a.Log("[Sync]: " + line)
						line = ""
					}
				} else {
					// Regular character - append to line
					line += string(char)
				}
			}
			if err != nil {
				// Emit any remaining content
				if line != "" {
					a.Log("[Sync]: " + line)
				}
				break
			}
		}
	}()

	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("sync failed: %w", err)
	}

	// 3. Success Message
	if direction == SyncDown {
		a.Log("✅ Download Complete. Starting Server...")
	} else {
		a.Log("✅ Upload Complete. Server Safe.")
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
