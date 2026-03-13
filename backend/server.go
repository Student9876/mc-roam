package backend

import (
	"context"
	"fmt"
	"go.mongodb.org/mongo-driver/bson"
	"os"
	"path/filepath"
	"time"
)

// CreateServer creates a new server group (UPDATED)
func (a *App) CreateServer(serverName string, serverType string, version string, ownerUsername string, configString string) ApiResult {
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	newID := fmt.Sprintf("srv_%d", time.Now().UnixNano())

	newServer := ServerGroup{
		ID:           newID,
		Name:         serverName,
		Type:         serverType, // <--- SAVE TYPE (e.g., "Paper", "Vanilla")
		Version:      version,    // <--- SAVE VERSION (e.g., "1.20.4")
		OwnerID:      ownerUsername,
		Members:      []string{ownerUsername},
		InviteCode:   generateInviteCode(),
		RcloneConfig: configString, // <--- SAVE THE KEYS
		Lock: ServerLock{
			IsRunning: false,
		},
	}

	_, err := collection.InsertOne(ctx, newServer)
	if err != nil {
		return ErrorResult("SERVER_CREATE_FAILED", fmt.Sprintf("Failed to create server: %v", err))
	}
	return SuccessResultWithData("Server created", map[string]string{"serverId": newID})
}

// DeleteServer removes the server from DB, Local Disk, and Cloud
func (a *App) DeleteServer(serverID string, username string) ApiResult {
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Fetch Server to check ownership
	var serverDoc ServerGroup
	err := collection.FindOne(ctx, bson.M{"_id": serverID}).Decode(&serverDoc)
	if err != nil {
		return ErrorResult("SERVER_NOT_FOUND", "Server not found")
	}

	// 2. SECURITY CHECK (The Fix)
	// We check 'OwnerID' because that is what is stored in your MongoDB
	if serverDoc.OwnerID != username {
		return ErrorResult("FORBIDDEN", "Only the server owner can delete this server")
	}

	// 3. Safety Check: Is it running?
	if serverDoc.Lock.IsRunning {
		return ErrorResult("SERVER_RUNNING", "Stop the server before deleting it")
	}

	// 4. Delete from Database
	_, err = collection.DeleteOne(ctx, bson.M{"_id": serverID})
	if err != nil {
		return ErrorResult("DB_DELETE_FAILED", "Failed to delete from database")
	}

	// 5. Delete Local Files
	localPath := a.getInstancePath(serverID)
	err = os.RemoveAll(localPath)
	if err != nil {
		a.Log("⚠️ Warning: Could not fully delete local files: " + err.Error())
	} else {
		a.Log("🗑️ Deleted local files.")
	}

	// 6. Delete Cloud Files (Background)
	go func() {
		// Matches the folder name format used in your rclone sync
		err := a.PurgeRemote("server-" + serverID)
		if err != nil {
			a.Log("⚠️ Failed to delete cloud files: " + err.Error())
		} else {
			a.Log("🔥 Deleted cloud backup.")
		}
	}()

	return SuccessResult("Server deleted")
}

// GetMyServers returns a list of servers the user belongs to
func (a *App) GetMyServers(username string) []ServerGroup {
	collection := DB.Client.Database("mc_roam").Collection("servers")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Find servers where 'members' array contains 'username'
	filter := bson.M{"members": username}
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return []ServerGroup{}
	}

	var servers []ServerGroup
	if err = cursor.All(ctx, &servers); err != nil {
		return []ServerGroup{}
	}

	for i := range servers {
		servers[i].Owner = servers[i].OwnerID
	}
	return servers
}

// JoinServer adds the user to a server using an invite code
func (a *App) JoinServer(inviteCode string, username string) ApiResult {
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Find the server with this code
	var server ServerGroup
	err := collection.FindOne(ctx, bson.M{"invite_code": inviteCode}).Decode(&server)
	if err != nil {
		return ErrorResult("INVALID_INVITE", "Invalid invite code")
	}

	// 2. Check if already a member
	for _, member := range server.Members {
		if member == username {
			return ErrorResult("ALREADY_MEMBER", "Already a member")
		}
	}

	// 3. Add user to members
	update := bson.M{"$push": bson.M{"members": username}}
	_, err = collection.UpdateOne(ctx, bson.M{"_id": server.ID}, update)
	if err != nil {
		return ErrorResult("DB_UPDATE_FAILED", "Failed to join server")
	}
	return SuccessResult("Joined server")
}

func generateInviteCode() string {
	// Simple timestamp-based unique string for now
	return fmt.Sprintf("%d", time.Now().UnixNano())[10:]
}

// StartServer attempts to acquire the lock for a server
func (a *App) StartServer(serverID string, username string) ApiResult {
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Fetch Server from DB
	var serverDoc ServerGroup
	err := collection.FindOne(ctx, bson.M{"_id": serverID}).Decode(&serverDoc)
	if err != nil {
		return ErrorResult("SERVER_NOT_FOUND", "Server not found")
	}

	// --- INJECT SHARED CLOUD CREDENTIALS ---
	// If the current user doesn't have an rclone.conf,
	// create it using the credentials stored in the Server Object.
	// This allows Friends to access the Host's Drive without logging in.

	// Check if local config exists
	if _, err := os.Stat("rclone.conf"); os.IsNotExist(err) {
		if serverDoc.RcloneConfig != "" {
			a.Log("🔑 Applying Shared Cloud Credentials...")
			// Write the stored config to a local file
			err := os.WriteFile("rclone.conf", []byte(serverDoc.RcloneConfig), 0644)
			if err != nil {
				return ErrorResult("CREDENTIAL_WRITE_FAILED", "Error writing shared credentials: "+err.Error())
			}
			a.Log("✅ Cloud credentials configured successfully!")
		} else {
			return ErrorResult("MISSING_CREDENTIALS", "No cloud credentials found for this server")
		}
	} else {
		// Config exists, but ensure it's up to date with server's config
		if serverDoc.RcloneConfig != "" {
			err = a.InjectConfig(serverDoc.RcloneConfig)
			if err != nil {
				return ErrorResult("CREDENTIAL_INJECT_FAILED", "Failed to inject cloud keys")
			}
		} else {
			return ErrorResult("MISSING_CREDENTIALS", "This server has no cloud config set up")
		}
	}
	// ---------------------------------------------

	// 3. Lock the Database
	// --- NEW: PICK DYNAMIC PORT FIRST ---
	port, err := GetFreePort()
	if err != nil {
		a.Log("⚠️ Could not find free port, defaulting to 25565")
		port = 25565
	}

	filter := bson.M{"_id": serverID, "lock.is_running": false}
	update := bson.M{
		"$set": bson.M{
			"lock.is_running": true,
			"lock.hosted_by":  username,
			"lock.hosted_at":  time.Now(),
			"lock.port":       port, // Save the assigned port
		},
	}
	result, err := collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return ErrorResult("DB_UPDATE_FAILED", "Database connection failed")
	}
	if result.ModifiedCount == 0 {
		return ErrorResult("ALREADY_RUNNING", "Server is already running (locked by someone else)")
	}

	// --- PATH CALCULATION ---
	localInstance := a.getInstancePath(serverID)
	remoteFolder := "server-" + serverID

	// 4. Pre-Check Cloud Status
	if !a.CheckCloudExists(remoteFolder) {
		a.forceUnlock(serverID)
		return ErrorResult("SETUP_REQUIRED", "directory not found (setup required)")
	}

	// 5. Trigger Sync Down
	a.Log("🔄 Syncing (down)...")
	// Clean locks BEFORE sync to avoid Access Denied errors
	a.CleanLocks(localInstance)

	err = a.RunSync(SyncDown, remoteFolder, localInstance)
	if err != nil {
		a.forceUnlock(serverID)
		return ErrorResult("SYNC_DOWN_FAILED", fmt.Sprintf("Sync failed: %v", err))
	}

	// 5.5. Check if server.jar exists (First-time setup check)
	serverJarPath := filepath.Join(localInstance, "server.jar")
	if _, err := os.Stat(serverJarPath); os.IsNotExist(err) {
		a.Log("📦 First-time setup detected. Downloading server files...")
		installResult := a.InstallServer(serverID)
		if !installResult.OK {
			a.forceUnlock(serverID)
			return ErrorResult("INSTALL_FAILED", "Installation failed: "+installResult.Message)
		}
		a.Log("✅ Server installation completed successfully!")
	}

	// 6. Deploy User's Playit Config (if exists)
	playitConfigPath := filepath.Join(localInstance, "playit.toml")
	if err := a.deployUserPlayitConfig(username, playitConfigPath); err != nil {
		a.Log("⚠️ No Playit account setup. Server will be LOCAL ONLY.")
		a.Log("ℹ️ To enable public access: Stop server → Settings → Setup Public Access → Import Config")
	}

	// 7. Launch Game with specific Port
	a.Log(fmt.Sprintf("🚀 Starting Server on Port %d...", port))
	err = a.RunMinecraftServer(localInstance, port)
	if err != nil {
		a.StopServer(serverID, username)
		return ErrorResult("SERVER_LAUNCH_FAILED", fmt.Sprintf("Failed to launch: %v", err))
	}

	// 8. Start Playit Tunnel if config was deployed
	if _, err := os.Stat(playitConfigPath); err == nil {
		a.Log("🔗 Playit config deployed. Starting tunnel in 3 seconds...")
		// Delay to ensure server and network are fully ready
		go func() {
			time.Sleep(3 * time.Second)
			a.StartPlayitTunnel(serverID)
		}()
	}

	// Return the port to the UI
	return SuccessResultWithData(fmt.Sprintf("Success:%d", port), map[string]int{"port": port})
}

// StopServer syncs data BACK to the specific cloud folder
func (a *App) StopServer(serverID string, username string) ApiResult {

	// Paths
	localInstance := a.getInstancePath(serverID)
	remoteFolder := "server-" + serverID

	// 1. Kill Process & Tunnel
	a.KillMinecraftServer()
	a.StopTunnel()
	time.Sleep(2 * time.Second) // Wait for file locks to release

	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	// 2. Verify Host
	filter := bson.M{
		"_id":             serverID,
		"lock.is_running": true,
		"lock.hosted_by":  username,
	}
	var doc ServerGroup
	err := collection.FindOne(ctx, filter).Decode(&doc)
	if err != nil {
		return ErrorResult("NOT_HOST_OR_STOPPED", "You are not the host, or server is already stopped")
	}

	// 3. Sync Up (Push)
	// Check if the instance folder exists locally
	if _, err := os.Stat(localInstance); err == nil {
		a.Log("🚀 Starting Upload (Sync Up)...")

		// Syncing: ./instances/123 -> server-123 (Cloud)
		syncErr := a.RunSync(SyncUp, remoteFolder, localInstance)
		status := "ok"
		if syncErr != nil {
			status = "error"
			a.Log("❌ Upload failed! Data NOT saved. (" + syncErr.Error() + ")")
		} else {
			a.Log("✅ Upload Complete!")
		}
		// Update sync state in DB
		updateSync := bson.M{
			"$set": bson.M{
				"last_sync_status": status,
				"last_sync_user":   username,
				"last_sync_time":   time.Now(),
			},
		}
		_, _ = collection.UpdateOne(ctx, bson.M{"_id": serverID}, updateSync)
		if syncErr != nil {
			return ErrorResult("SYNC_UP_FAILED", fmt.Sprintf("Upload failed! Data NOT saved. (%v)", syncErr))
		}
	}

	// 4. Release Lock
	update := bson.M{
		"$set": bson.M{
			"lock.is_running": false,
			"lock.hosted_by":  "",
			"lock.hosted_at":  time.Time{},
			"lock.port":       0,
		},
	}
	_, err = collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return ErrorResult("DB_UPDATE_FAILED", "Database update failed (but files were synced)")
	}

	return SuccessResult("Server stopped and saved")
}
