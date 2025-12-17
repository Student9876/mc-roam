package backend

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

// InstallServer downloads the server and pushes it to the cloud
// InstallServer downloads files and uploads them to a SERVER-SPECIFIC cloud folder
func (a *App) InstallServer(serverID string) string {

	// 1. Calculate Paths (DYNAMICALLY)
	localInstance := a.getInstancePath(serverID) // e.g., instances/srv_12345
	remoteFolder := "server-" + serverID         // e.g., server-srv_12345 (Unique in Cloud!)

	// 2. WIPE OLD DATA (Local)
	a.Log(fmt.Sprintf("🧹 Cleaning up instance files in %s...", localInstance))
	os.RemoveAll(localInstance)

	// 3. Re-create Directory
	if err := os.MkdirAll(localInstance, 0755); err != nil {
		return fmt.Sprintf("Error: Could not create folder: %v", err)
	}

	// 4. Download Server Jar
	downloadUrl := "https://api.papermc.io/v2/projects/paper/versions/1.20.4/builds/496/downloads/paper-1.20.4-496.jar"

	a.Log("⬇️ Downloading Server Jar...")
	err := downloadFile(downloadUrl, filepath.Join(localInstance, "server.jar"))
	if err != nil {
		return fmt.Sprintf("Error: Download failed: %v", err)
	}

	// 5. Write Config Files
	eulaContent := "eula=true\n"
	os.WriteFile(filepath.Join(localInstance, "eula.txt"), []byte(eulaContent), 0644)

	propsContent := "online-mode=false\nspawn-protection=0\n"
	os.WriteFile(filepath.Join(localInstance, "server.properties"), []byte(propsContent), 0644)

	// 6. UPLOAD TO SPECIFIC CLOUD FOLDER
	a.Log(fmt.Sprintf("🚀 Uploading to Cloud Folder: %s...", remoteFolder))

	// CRITICAL FIX: Use 'remoteFolder' variable, NOT "minecraft-server"
	err = a.RunSync(SyncUp, remoteFolder, localInstance)
	if err != nil {
		return fmt.Sprintf("Error: Failed to upload to cloud: %v", err)
	}

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
