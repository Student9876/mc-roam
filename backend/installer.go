package backend

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

// InstallServer downloads the server and pushes it to the cloud
// InstallServer downloads files and uploads them to a SERVER-SPECIFIC cloud folder
func (a *App) InstallServer(serverID string) ApiResult {

	// 1. Get Server Details from Database
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var server ServerGroup
	err := collection.FindOne(ctx, bson.M{"_id": serverID}).Decode(&server)
	if err != nil {
		return ErrorResult("SERVER_NOT_FOUND", fmt.Sprintf("Server not found: %v", err))
	}

	// 2. Get Version Details (MATCHING TYPE AND VERSION)
	vCollection := DB.Client.Database("mc_roam").Collection("versions")
	var versionDoc ServerVersion

	// Query: WHERE type = server.Type AND version = server.Version
	filter := bson.M{
		"type":    server.Type,
		"version": server.Version,
	}

	err = vCollection.FindOne(ctx, filter).Decode(&versionDoc)
	if err != nil {
		return ErrorResult("VERSION_NOT_FOUND", fmt.Sprintf("Version not found for %s %s: %v", server.Type, server.Version, err))
	}

	// 3. Calculate Paths (DYNAMICALLY)
	localInstance := a.getInstancePath(serverID) // e.g., instances/srv_12345
	remoteFolder := "server-" + serverID         // e.g., server-srv_12345 (Unique in Cloud!)

	// 3.5. BACKUP playit.toml if it exists (so we don't lose it during cleanup)
	playitConfigPath := filepath.Join(localInstance, "playit.toml")
	var playitBackup []byte
	if data, err := os.ReadFile(playitConfigPath); err == nil {
		playitBackup = data
		a.Log("🔒 Backing up Playit configuration...")
	}

	// 4. WIPE OLD DATA (Local)
	a.Log(fmt.Sprintf("🧹 Cleaning up instance files in %s...", localInstance))
	os.RemoveAll(localInstance)

	// 5. Re-create Directory
	if err := os.MkdirAll(localInstance, 0755); err != nil {
		return ErrorResult("INSTANCE_DIR_CREATE_FAILED", fmt.Sprintf("Could not create folder: %v", err))
	}

	// 6. Download Server Jar using URL from database
	a.Log(fmt.Sprintf("⬇️ Downloading %s %s Server Jar...", server.Type, server.Version))
	err = downloadFile(versionDoc.Url, filepath.Join(localInstance, "server.jar"))
	if err != nil {
		return ErrorResult("DOWNLOAD_FAILED", fmt.Sprintf("Download failed: %v", err))
	}

	// 7. Write Config Files
	eulaContent := "eula=true\n"
	os.WriteFile(filepath.Join(localInstance, "eula.txt"), []byte(eulaContent), 0644)

	propsContent := "online-mode=false\nspawn-protection=0\n"
	os.WriteFile(filepath.Join(localInstance, "server.properties"), []byte(propsContent), 0644)

	// 7.5. RESTORE playit.toml if we backed it up
	if len(playitBackup) > 0 {
		err := os.WriteFile(playitConfigPath, playitBackup, 0644)
		if err == nil {
			a.Log("✅ Restored Playit configuration!")
		}
	}

	// 8. UPLOAD TO SPECIFIC CLOUD FOLDER
	a.Log(fmt.Sprintf("🚀 Uploading to Cloud Folder: %s...", remoteFolder))

	// CRITICAL FIX: Use 'remoteFolder' variable, NOT "minecraft-server"
	err = a.RunSync(SyncUp, remoteFolder, localInstance)
	if err != nil {
		return ErrorResult("SYNC_UP_FAILED", fmt.Sprintf("Failed to upload to cloud: %v", err))
	}

	return SuccessResult("Server installed and uploaded")
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
