package backend

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

// InstallServer downloads the server and pushes it to the cloud
func (a *App) InstallServer(version string) string {
	serverDir := "./minecraft_server"

	// 1. WIPE OLD DATA
	fmt.Println("🧹 Cleaning up old server files...")
	os.RemoveAll(serverDir)

	// 2. Re-create Directory
	if err := os.MkdirAll(serverDir, 0755); err != nil {
		return fmt.Sprintf("Error: Could not create folder: %v", err)
	}

	// 3. Download Server Jar (Paper 1.20.4)
	downloadUrl := "https://api.papermc.io/v2/projects/paper/versions/1.20.4/builds/496/downloads/paper-1.20.4-496.jar"

	fmt.Println("⬇️ Downloading Server Jar...")
	err := downloadFile(downloadUrl, filepath.Join(serverDir, "server.jar"))
	if err != nil {
		return fmt.Sprintf("Error: Download failed: %v", err)
	}

	// 4. Write Config Files
	eulaContent := "eula=true\n"
	os.WriteFile(filepath.Join(serverDir, "eula.txt"), []byte(eulaContent), 0644)

	propsContent := "online-mode=false\nspawn-protection=0\n"
	os.WriteFile(filepath.Join(serverDir, "server.properties"), []byte(propsContent), 0644)

	// --- NEW STEP: UPLOAD IMMEDIATELY ---
	fmt.Println("🚀 Uploading new server to Cloud...")
	// We reuse the SyncUp constant (assuming it's defined as 0 or 1 in your rclone.go)
	// If 'SyncUp' is not visible here, check rclone.go package name is 'backend'
	err = a.RunSync(SyncUp, "minecraft-server", serverDir)
	if err != nil {
		return fmt.Sprintf("Error: Failed to upload to cloud: %v", err)
	}
	// ------------------------------------

	return "Success: Server Installed & Uploaded!"
}

// Helper function to download a file
func downloadFile(url string, destPath string) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("server returned %d", resp.StatusCode)
	}

	out, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	return err
}
