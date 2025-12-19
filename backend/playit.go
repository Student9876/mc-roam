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
func (a *App) LaunchPlayitExternally(serverID string) string {
	if err := a.ensurePlayitBinary(); err != nil {
		return "Error: Download failed"
	}

	// We just launch it. It will save config to %LocalAppData%\playit_gg\playit.toml
	absPath, _ := filepath.Abs(getPlayitBin())
	cmd := exec.Command("cmd", "/c", "start", "Playit Setup", "cmd", "/k", absPath)

	if err := cmd.Start(); err != nil {
		return "Error launching: " + err.Error()
	}
	return "Success"
}

// 2. Import the config from AppData to our Server Folder
func (a *App) ImportPlayitConfig(serverID string) string {
	// Construct path: C:\Users\User\AppData\Local\playit_gg\playit.toml
	homeDir, _ := os.UserHomeDir()
	globalConfigPath := filepath.Join(homeDir, "AppData", "Local", "playit_gg", "playit.toml")

	// Check if it exists
	if _, err := os.Stat(globalConfigPath); os.IsNotExist(err) {
		return "Error: Config file not found in AppData. Did you claim the link?"
	}

	// Read the content
	content, err := os.ReadFile(globalConfigPath)
	if err != nil {
		return "Error reading config: " + err.Error()
	}

	// Destination: instances/srv_ID/playit.toml
	instanceDir := a.getInstancePath(serverID)
	os.MkdirAll(instanceDir, 0755)
	destPath := filepath.Join(instanceDir, "playit.toml")

	// Write to server folder
	err = os.WriteFile(destPath, content, 0644)
	if err != nil {
		return "Error saving to server: " + err.Error()
	}

	a.Log("✅ Successfully imported Playit config!")
	return "Success"
}

// 3. Start Tunnel (Standard)
func (a *App) StartPlayitTunnel(serverID string) {
	if err := a.ensurePlayitBinary(); err != nil {
		return
	}

	instanceDir := a.getInstancePath(serverID)
	absPath, _ := filepath.Abs(getPlayitBin())

	cmd := exec.Command(absPath)
	cmd.Dir = instanceDir
	// Playit will now find the 'playit.toml' we copied into this folder

	// Capture output pipe instead of dumping to os.Stdout
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		a.Log("⚠️ Failed to start Playit tunnel.")
		return
	}
	// Merge Stderr into Stdout to catch errors too
	cmd.Stderr = cmd.Stdout

	if err := cmd.Start(); err != nil {
		a.Log("⚠️ Failed to start Playit tunnel.")
		return
	}

	a.Log("🔗 Starting Playit tunnel...")

	// Read logs and Emit to Frontend
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text()
			// Prefix with [Playit] so we can filter it in the Console tab
			a.Log("[Playit]: " + line)

			// Look for tunnel URL pattern and save it
			if strings.Contains(line, "playit.gg") {
				// Try to extract the URL/address
				if idx := strings.Index(line, "http"); idx != -1 {
					url := extractURL(line[idx:])
					if url != "" {
						a.saveTunnelURL(serverID, url)
						a.Log(fmt.Sprintf("🌐 Public Address: %s", url))
					}
				} else if strings.Contains(line, "playit.gg") {
					if addr := extractPlayitAddress(line); addr != "" {
						a.saveTunnelURL(serverID, addr)
						a.Log(fmt.Sprintf("🌐 Public Address: %s", addr))
					}
				}
			}
		}
	}()
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
