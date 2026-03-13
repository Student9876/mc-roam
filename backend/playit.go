package backend

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

// ensurePlayitBinary checks if playit.exe exists, if not, downloads it
func (a *App) ensurePlayitBinary() error {
	binPath := getPlayitBin()
	if _, err := os.Stat(binPath); err == nil {
		return nil
	}
	a.Log("⬇️ Downloading Playit.gg agent...")
	url := "https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-windows-x86_64.exe"
	if runtime.GOARCH == "386" {
		url = "https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-windows-x86.exe"
	}
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	out, err := os.Create(binPath)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, resp.Body)
	return err
}

// 1. Launch Terminal (Standard launch, we let it save to AppData)
func (a *App) LaunchPlayitExternally(serverID string) ApiResult {
	if err := a.ensurePlayitBinary(); err != nil {
		return ErrorResult("PLAYIT_DOWNLOAD_FAILED", "Download failed")
	}

	// We just launch it. It will save config to %LocalAppData%\playit_gg\playit.toml
	absPath, _ := filepath.Abs(getPlayitBin())
	cmd := exec.Command("cmd", "/c", "start", "Playit Setup", "cmd", "/k", absPath)

	if err := cmd.Start(); err != nil {
		return ErrorResult("PLAYIT_LAUNCH_FAILED", "Error launching: "+err.Error())
	}
	return SuccessResult("Playit setup terminal launched")
}

// 2. Import the config from AppData and save to User's DB record
func (a *App) ImportPlayitConfig(username string) ApiResult {
	// Construct path: C:\Users\User\AppData\Local\playit_gg\playit.toml
	homeDir, _ := os.UserHomeDir()
	globalConfigPath := filepath.Join(homeDir, "AppData", "Local", "playit_gg", "playit.toml")

	// Check if it exists
	if _, err := os.Stat(globalConfigPath); os.IsNotExist(err) {
		return ErrorResult("PLAYIT_CONFIG_NOT_FOUND", "Config file not found in AppData. Did you claim the link?")
	}

	// Read the content
	content, err := os.ReadFile(globalConfigPath)
	if err != nil {
		return ErrorResult("PLAYIT_CONFIG_READ_FAILED", "Error reading config: "+err.Error())
	}

	// Save to user's database record
	collection := DB.Client.Database("mc_roam").Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{
		"$set": bson.M{
			"playit_toml_content": string(content),
		},
	}

	_, err = collection.UpdateOne(ctx, bson.M{"username": username}, update)
	if err != nil {
		return ErrorResult("DB_UPDATE_FAILED", "Error saving to database: "+err.Error())
	}

	a.Log("✅ Successfully saved Playit config to your account!")
	return SuccessResult("Playit config saved")
}

// 3. Start Tunnel (Standard) with retry logic for cloud deployments
func (a *App) StartPlayitTunnel(serverID string) {
	if err := a.ensurePlayitBinary(); err != nil {
		return
	}

	instanceDir := a.getInstancePath(serverID)

	// Verify playit.toml exists before attempting to start
	playitConfigPath := filepath.Join(instanceDir, "playit.toml")
	if _, err := os.Stat(playitConfigPath); os.IsNotExist(err) {
		a.Log("⚠️ Playit config not found. Skipping tunnel setup.")
		return
	}

	// Add a small delay to ensure network is ready (especially on cloud)
	time.Sleep(2 * time.Second)

	// Retry logic for cloud servers with network issues
	maxRetries := 3
	retryDelay := 5 * time.Second

	for attempt := 1; attempt <= maxRetries; attempt++ {
		if attempt > 1 {
			a.Log(fmt.Sprintf("🔄 Retry attempt %d/%d...", attempt, maxRetries))
			time.Sleep(retryDelay)
		}

		if a.attemptStartPlayit(serverID, instanceDir) {
			return // Success
		}

		if attempt < maxRetries {
			a.Log(fmt.Sprintf("⚠️ Connection failed. Retrying in %v seconds...", retryDelay.Seconds()))
		}
	}

	a.Log("❌ Failed to establish Playit tunnel after multiple attempts.")
	a.Log("💡 Possible causes: Firewall blocking, network issues, or invalid secret key.")
	a.Log("💡 Try: 1) Check firewall settings 2) Verify internet connection 3) Re-import Playit config")
}

// StopTunnel stops the playit.exe tunnel process
func (a *App) StopTunnel() error {
	a.Log("🛑 Stopping Playit tunnel...")

	// Kill all playit.exe processes
	cmd := exec.Command("taskkill", "/F", "/IM", "playit.exe")
	prepareCommand(cmd)

	if err := cmd.Run(); err != nil {
		// Process might not be running, which is fine
		a.Log("⚠️ No Playit tunnel found (may already be stopped)")
		return nil
	}

	a.Log("✅ Playit tunnel stopped")
	return nil
}

// attemptStartPlayit tries to start the Playit tunnel once
func (a *App) attemptStartPlayit(serverID string, instanceDir string) bool {
	absPath, _ := filepath.Abs(getPlayitBin())

	cmd := exec.Command(absPath)
	cmd.Dir = instanceDir
	// Playit will now find the 'playit.toml' we copied into this folder

	// Capture output pipe instead of dumping to os.Stdout
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		a.Log("⚠️ Failed to create output pipe.")
		return false
	}
	// Merge Stderr into Stdout to catch errors too
	cmd.Stderr = cmd.Stdout

	if err := cmd.Start(); err != nil {
		a.Log(fmt.Sprintf("⚠️ Failed to start Playit: %v", err))
		return false
	}

	a.Log("🔗 Starting Playit tunnel...")

	// Read logs and Emit to Frontend with connection validation
	connectionSuccess := make(chan bool, 1)
	errorDetected := make(chan bool, 1)

	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text()
			// Prefix with [Playit] so we can filter it in the Console tab
			a.Log("[Playit]: " + line)

			// Detect connection errors
			if strings.Contains(line, "Error:") || strings.Contains(line, "RequestError") ||
				strings.Contains(line, "ConnectionReset") || strings.Contains(line, "forcibly closed") {
				select {
				case errorDetected <- true:
				default:
				}
			}

			// Detect successful connection
			if strings.Contains(line, "agent has") && strings.Contains(line, "tunnel") {
				select {
				case connectionSuccess <- true:
				default:
				}
			}

			// Look for tunnel URL pattern and save it
			if strings.Contains(line, "playit.gg") {
				// Try to extract the URL/address
				if idx := strings.Index(line, "http"); idx != -1 {
					url := extractURL(line[idx:])
					if url != "" {
						a.saveTunnelURL(serverID, url)
						a.Log(fmt.Sprintf("🌐 Public Address: %s", url))
						select {
						case connectionSuccess <- true:
						default:
						}
					}
				} else if strings.Contains(line, "playit.gg") {
					if addr := extractPlayitAddress(line); addr != "" {
						a.saveTunnelURL(serverID, addr)
						a.Log(fmt.Sprintf("🌐 Public Address: %s", addr))
						select {
						case connectionSuccess <- true:
						default:
						}
					}
				}
			}
		}
	}()

	// Wait for either success or failure with timeout
	timeout := time.After(30 * time.Second)
	select {
	case <-connectionSuccess:
		a.Log("✅ Playit tunnel established successfully!")
		return true
	case <-errorDetected:
		a.Log("⚠️ Connection error detected")
		cmd.Process.Kill()
		return false
	case <-timeout:
		a.Log("⚠️ Tunnel startup timeout")
		cmd.Process.Kill()
		return false
	}
}

// Helper to extract URL from line
func extractURL(text string) string {
	parts := strings.Fields(text)
	for _, part := range parts {
		if strings.HasPrefix(part, "http") {
			return strings.TrimRight(part, ".,;:)")
		}
	}
	return ""
}

// Helper to extract playit.gg address
func extractPlayitAddress(text string) string {
	parts := strings.Fields(text)
	for _, part := range parts {
		if strings.Contains(part, "playit.gg") {
			return strings.TrimRight(part, ".,;:)")
		}
	}
	return ""
}

// Save tunnel URL to database
func (a *App) saveTunnelURL(serverID string, tunnelURL string) {
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{
		"$set": bson.M{
			"lock.tunnel_url": tunnelURL,
		},
	}

	_, err := collection.UpdateOne(ctx, bson.M{"_id": serverID}, update)
	if err != nil {
		a.Log("⚠️ Failed to save tunnel URL to database")
	}
}

// deployUserPlayitConfig fetches user's playit.toml from DB and writes to local file
func (a *App) deployUserPlayitConfig(username string, destPath string) error {
	collection := DB.Client.Database("mc_roam").Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user User
	err := collection.FindOne(ctx, bson.M{"username": username}).Decode(&user)
	if err != nil {
		return fmt.Errorf("user not found")
	}

	if user.PlayitTomlContent == "" {
		return fmt.Errorf("no playit config in user account")
	}

	// Write the config to the destination
	err = os.WriteFile(destPath, []byte(user.PlayitTomlContent), 0644)
	if err != nil {
		return fmt.Errorf("failed to write config: %v", err)
	}

	a.Log("✅ Deployed your Playit tunnel config")
	return nil
}
