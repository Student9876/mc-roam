package backend

import (
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

// ensurePlayitBinary checks if playit.exe exists, if not, downloads it
func (a *App) ensurePlayitBinary() error {
	binPath := "./playit.exe"
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
	absPath, _ := filepath.Abs("./playit.exe")
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
	absPath, _ := filepath.Abs("./playit.exe")

	cmd := exec.Command(absPath)
	cmd.Dir = instanceDir
	// Playit will now find the 'playit.toml' we copied into this folder

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		a.Log("⚠️ Failed to start Playit tunnel.")
	}
}
