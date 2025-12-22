package backend

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
	"syscall"
	"time" // Add this import
)

// SyncDirection defines if we are Pulling (Down) or Pushing (Up)
type SyncDirection string

const (
	SyncDown SyncDirection = "down" // Cloud -> Local
	SyncUp   SyncDirection = "up"   // Local -> Cloud
)

// RunSync executes the Rclone command and streams output to UI
func (a *App) RunSync(direction SyncDirection, remotePath string, localPath string) error {
	rcloneBin := getToolPath("rclone.exe")
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

	// --- FIX 1: Ensure folder exists with proper delay ---
	EnsureLocalFolder(localPath)

	// Give Windows time to register the folder (especially on slower drives)
	time.Sleep(500 * time.Millisecond)
	a.Log(fmt.Sprintf("📁 Target folder ready: %s", localPath))
	// -----------------------------------------------------

	// 3. Build Base Command Args
	args := []string{
		"sync", source, dest,
		"--progress",
		"--stats", "2s", // Increased from 1s to reduce overhead
		"--stats-one-line",
		"--transfers", "4", // Reduced from 8 to prevent Windows handle exhaustion
		"--config", getRcloneConfig(),
		"--exclude", "session.lock",
		"--exclude", "logs/**",
		"--exclude", "cache/**",
		"--exclude", "libraries/**",
		"--exclude", "versions/**",
		"--exclude", "crash-reports/**",
		"--exclude", "playit.toml", // NEVER sync - stored in user's DB instead
		// --- FIX 2: Windows-specific flags to prevent hangs ---
		"--no-traverse",        // Don't traverse the entire tree first
		"--fast-list",          // Use recursive list if available
		"--buffer-size", "16M", // Reduce memory usage
		"--timeout", "10m", // Add overall timeout
		"--contimeout", "60s", // Connection timeout
		// ------------------------------------------------------
	}

	cmd := exec.Command(rcloneBin, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	// --- FIX 3: Use non-blocking pipes ---
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}
	// -------------------------------------

	if err := cmd.Start(); err != nil {
		return err
	}

	// --- FIX 4: Read both stdout and stderr concurrently ---
	done := make(chan bool)

	// Read stdout
	go func() {
		buf := make([]byte, 1024) // Larger buffer for efficiency
		line := ""
		for {
			n, err := stdout.Read(buf)
			if n > 0 {
				for i := 0; i < n; i++ {
					char := buf[i]
					if char == '\r' {
						if line != "" {
							if !shouldSuppressSyncLog(line) {
								a.Log("[Sync]: " + line)
							}
							line = ""
						}
					} else if char == '\n' {
						if line != "" {
							if !shouldSuppressSyncLog(line) {
								a.Log("[Sync]: " + line)
							}
							line = ""
						}
					} else {
						line += string(char)
					}
				}
			}
			if err != nil {
				if line != "" {
					if !shouldSuppressSyncLog(line) {
						a.Log("[Sync]: " + line)
					}
				}
				break
			}
		}
	}()

	// Read stderr separately
	go func() {
		buf := make([]byte, 1024)
		line := ""
		for {
			n, err := stderr.Read(buf)
			if n > 0 {
				for i := 0; i < n; i++ {
					char := buf[i]
					if char == '\n' {
						if line != "" {
							a.Log("[Sync Error]: " + line)
							line = ""
						}
					} else {
						line += string(char)
					}
				}
			}
			if err != nil {
				if line != "" {
					a.Log("[Sync Error]: " + line)
				}
				break
			}
		}
	}()

	// --- FIX 5: Add timeout for the entire operation ---
	go func() {
		time.Sleep(1 * time.Hour) // Increased timeout to 1 hour
		if cmd.Process != nil {
			a.Log("⚠️ Sync timeout reached, killing process...")
			cmd.Process.Kill()
		}
	}()
	// ----------------------------------------------------

	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("sync failed: %w", err)
	}

	close(done)

	// 6. Success Message
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
		"--config", getRcloneConfig(),
	}

	cmd := exec.Command(getToolPath("rclone.exe"), args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	// We don't need to stream logs for this, just run it
	return cmd.Run()
}

// Helper to filter out misleading rclone log lines
func shouldSuppressSyncLog(line string) bool {
	// Suppress --no-traverse warning and similar non-critical lines
	if strings.Contains(line, "Ignoring --no-traverse with sync") {
		return true
	}
	return false
}
