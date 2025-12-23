package backend

import (
	"context"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
	"io"
	"os"
	"path/filepath"
	"time"
)

// GetVersions returns all available versions for the dropdown
func (a *App) GetVersions() []ServerVersion {
	collection := DB.Client.Database("mc_roam").Collection("versions")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Sort by Version descending (simplified sort)
	opts := options.Find().SetSort(bson.D{{"version", -1}})
	cursor, err := collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return []ServerVersion{}
	}

	var results []ServerVersion
	if err = cursor.All(ctx, &results); err != nil {
		return []ServerVersion{}
	}
	return results
}

// SeedVersions populates the DB with multiple types
func (a *App) SeedVersions() {
	collection := DB.Client.Database("mc_roam").Collection("versions")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, _ := collection.CountDocuments(ctx, bson.M{})
	if count > 0 {
		return
	}

	a.Log("🌱 Seeding Database with Multi-Type Versions...")

	// initialVersions := []interface{}{
	// 	// --- PAPER (Optimized, Plugins) ---
	// 	ServerVersion{Type: "Paper", Version: "1.20.4", Url: "https://api.papermc.io/v2/projects/paper/versions/1.20.4/builds/496/downloads/paper-1.20.4-496.jar"},
	// 	ServerVersion{Type: "Paper", Version: "1.20.2", Url: "https://api.papermc.io/v2/projects/paper/versions/1.20.2/builds/318/downloads/paper-1.20.2-318.jar"},
	// 	ServerVersion{Type: "Paper", Version: "1.19.4", Url: "https://api.papermc.io/v2/projects/paper/versions/1.19.4/builds/550/downloads/paper-1.19.4-550.jar"},

	// 	// --- VANILLA (Standard Mojang) ---
	// 	// Real URLs from piston-meta.mojang.com
	// 	ServerVersion{Type: "Vanilla", Version: "1.20.4", Url: "https://piston-data.mojang.com/v1/objects/8dd1a28015f51b1803213892b50b7b4fc76e594d/server.jar"},
	// 	ServerVersion{Type: "Vanilla", Version: "1.20.2", Url: "https://piston-data.mojang.com/v1/objects/5b868151bd02b41319f54c8d4061b8cae84e665c/server.jar"},
	// 	ServerVersion{Type: "Vanilla", Version: "1.16.5", Url: "https://launcher.mojang.com/v1/objects/1b557e7b033b583cd9f66746b7a9ab1ec1673ced/server.jar"},
	// }

	// NEW EXPANDED LIST (Old & Latest)
	initialVersions := []interface{}{
		// --- PAPER (Optimized) ---
		// Latest Stable (1.21.x) - Check API for specific build updates
		ServerVersion{Type: "Paper", Version: "1.21", Url: "https://api.papermc.io/v2/projects/paper/versions/1.21/builds/130/downloads/paper-1.21-130.jar"},
		// Recent Stable
		ServerVersion{Type: "Paper", Version: "1.20.4", Url: "https://api.papermc.io/v2/projects/paper/versions/1.20.4/builds/496/downloads/paper-1.20.4-496.jar"},
		// Modern Classic (1.19)
		ServerVersion{Type: "Paper", Version: "1.19.4", Url: "https://api.papermc.io/v2/projects/paper/versions/1.19.4/builds/550/downloads/paper-1.19.4-550.jar"},
		// The "Combat Update" Classic (1.16.5)
		ServerVersion{Type: "Paper", Version: "1.16.5", Url: "https://api.papermc.io/v2/projects/paper/versions/1.16.5/builds/794/downloads/paper-1.16.5-794.jar"},
		// The "Modding" Classic (1.12.2)
		ServerVersion{Type: "Paper", Version: "1.12.2", Url: "https://api.papermc.io/v2/projects/paper/versions/1.12.2/builds/1618/downloads/paper-1.12.2-1618.jar"},
		// The "PVP" Classic (1.8.8)
		ServerVersion{Type: "Paper", Version: "1.8.8", Url: "https://api.papermc.io/v2/projects/paper/versions/1.8.8/builds/443/downloads/paper-1.8.8-443.jar"},

		// --- VANILLA (Standard Mojang) ---
		// Latest (1.21.1)
		ServerVersion{Type: "Vanilla", Version: "1.21.1", Url: "https://piston-data.mojang.com/v1/objects/59353fb40c36d304f2035d51e7d6e6baa98dc05c/server.jar"},
		// Recent (1.20.4)
		ServerVersion{Type: "Vanilla", Version: "1.20.4", Url: "https://piston-data.mojang.com/v1/objects/8dd1a28015f51b1803213892b50b7b4fc76e594d/server.jar"},
		// Classic (1.16.5)
		ServerVersion{Type: "Vanilla", Version: "1.16.5", Url: "https://launcher.mojang.com/v1/objects/1b557e7b033b583cd9f66746b7a9ab1ec1673ced/server.jar"},
		// Legacy (1.12.2)
		ServerVersion{Type: "Vanilla", Version: "1.12.2", Url: "https://piston-data.mojang.com/v1/objects/886945eccb5b5603c94c54a5203a1868f3765a9d/server.jar"},
		// Ancient (1.8.8)
		ServerVersion{Type: "Vanilla", Version: "1.8.8", Url: "https://piston-data.mojang.com/v1/objects/5fafba3f58c4270729908e28175320d7ee3a854c/server.jar"},

		// --- PAPER (Optimized, Plugins) ---
		ServerVersion{Type: "Paper", Version: "1.20.4", Url: "https://api.papermc.io/v2/projects/paper/versions/1.20.4/builds/496/downloads/paper-1.20.4-496.jar"},
		ServerVersion{Type: "Paper", Version: "1.20.2", Url: "https://api.papermc.io/v2/projects/paper/versions/1.20.2/builds/318/downloads/paper-1.20.2-318.jar"},
		ServerVersion{Type: "Paper", Version: "1.19.4", Url: "https://api.papermc.io/v2/projects/paper/versions/1.19.4/builds/550/downloads/paper-1.19.4-550.jar"},

		// 	// --- VANILLA (Standard Mojang) ---
		// 	// Real URLs from piston-meta.mojang.com
		ServerVersion{Type: "Vanilla", Version: "1.20.4", Url: "https://piston-data.mojang.com/v1/objects/8dd1a28015f51b1803213892b50b7b4fc76e594d/server.jar"},
		ServerVersion{Type: "Vanilla", Version: "1.20.2", Url: "https://piston-data.mojang.com/v1/objects/5b868151bd02b41319f54c8d4061b8cae84e665c/server.jar"},
		ServerVersion{Type: "Vanilla", Version: "1.16.5", Url: "https://launcher.mojang.com/v1/objects/1b557e7b033b583cd9f66746b7a9ab1ec1673ced/server.jar"},
	}

	_, err := collection.InsertMany(ctx, initialVersions)
	if err != nil {
		a.Log("⚠️ Failed to seed versions: " + err.Error())
	} else {
		a.Log("✅ Versions database seeded!")
	}
}

// ChangeServerVersion changes the server type and version, preserving world/config files
func (a *App) ChangeServerVersion(serverID string, newType string, newVersion string, username string) string {
	// 0. Check if server is running (locked)
	serversColl := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()
	var serverDoc ServerGroup
	err := serversColl.FindOne(ctx, bson.M{"_id": serverID}).Decode(&serverDoc)
	if err != nil {
		return "Error: Server not found"
	}
	if serverDoc.Lock.IsRunning {
		return "Error: Cannot change version while server is running! Please stop the server first."
	}

	// 1. Lookup the requested version/type in the versions collection
	versionsColl := DB.Client.Database("mc_roam").Collection("versions")
	var versionDoc ServerVersion
	err = versionsColl.FindOne(ctx, bson.M{"type": newType, "version": newVersion}).Decode(&versionDoc)
	if err != nil {
		return "Error: Version not found in database"
	}

	// 2. Sync down latest files from cloud
	instancePath := a.getInstancePath(serverID)
	remoteFolder := "server-" + serverID
	a.Log("🔄 Syncing down latest files before version change...")
	err = a.RunSync(SyncDown, remoteFolder, instancePath)
	if err != nil {
		return "Error: Sync down failed: " + err.Error()
	}

	// 3. Replace server.jar (and any other necessary files)
	jarPath := filepath.Join(instancePath, "server.jar")
	// Ensure instance directory exists
	if _, err := os.Stat(instancePath); os.IsNotExist(err) {
		a.Log("Instance directory missing, creating: " + instancePath)
		if err := os.MkdirAll(instancePath, 0755); err != nil {
			a.Log("Failed to create instance directory: " + err.Error())
			return "Error: Failed to create instance directory: " + err.Error()
		}
	}
	os.Remove(jarPath)
	out, err := os.Create(jarPath)
	if err != nil {
		a.Log("Failed to create server.jar: " + err.Error())
		return "Error: Failed to create server.jar file: " + err.Error()
	}
	defer out.Close()
	resp, err := DownloadFile(versionDoc.Url)
	if err != nil {
		a.Log("Failed to download new server jar: " + err.Error())
		return "Error: Failed to download new server jar: " + err.Error()
	}
	defer resp.Body.Close()
	_, err = io.Copy(out, resp.Body)
	if err != nil {
		a.Log("Failed to write new server jar: " + err.Error())
		return "Error: Failed to write new server jar: " + err.Error()
	}

	// 4. Update the server's type and version in the DB
	_, err = serversColl.UpdateOne(ctx, bson.M{"_id": serverID}, bson.M{"$set": bson.M{"type": newType, "version": newVersion}})
	if err != nil {
		return "Error: Failed to update server type/version in database"
	}

	// 5. Sync up to save changes in cloud
	a.Log("☁️ Syncing up after version change...")
	syncErr := a.RunSync(SyncUp, remoteFolder, instancePath)
	status := "ok"
	if syncErr != nil {
		status = "error"
	}
	// Update sync state in DB
	updateSync := bson.M{
		"$set": bson.M{
			"last_sync_status": status,
			"last_sync_user":   username,
			"last_sync_time":   time.Now(),
		},
	}
	_, _ = serversColl.UpdateOne(ctx, bson.M{"_id": serverID}, updateSync)
	if syncErr != nil {
		return "Error: Sync up failed: " + syncErr.Error()
	}

	a.Log("✅ Server version changed: " + newType + " " + newVersion)
	return "Success: Server version changed to " + newType + " " + newVersion
}

// Wails method: ChangeServerVersion
// Expose to frontend
func (a *App) ChangeServerVersionWails(serverID string, newType string, newVersion string, username string) string {
	return a.ChangeServerVersion(serverID, newType, newVersion, username)
}
