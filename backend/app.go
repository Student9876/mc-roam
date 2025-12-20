package backend

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings" // Add this to imports at top!
	"syscall"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"go.mongodb.org/mongo-driver/bson"  // Add this
	"go.mongodb.org/mongo-driver/mongo" // Add this
	"golang.org/x/crypto/bcrypt"        // Add this
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// getAppDir returns the directory where the .exe is running
func getAppDir() string {
	ex, err := os.Executable()
	if err != nil {
		// Fallback to working directory if executable path fails
		dir, _ := os.Getwd()
		return dir
	}
	return filepath.Dir(ex)
}

// ensureDataDir ensures the data folder exists and returns its path
func ensureDataDir() string {
	appDir := getAppDir()
	dataDir := filepath.Join(appDir, "mc_roam_data") // All servers go here

	// Create the folder if it doesn't exist
	if _, err := os.Stat(dataDir); os.IsNotExist(err) {
		log.Println("📁 Creating data directory at:", dataDir)
		os.MkdirAll(dataDir, 0755)
	}
	return dataDir
}

// getPlayitBin returns the absolute path to playit.exe
func getPlayitBin() string {
	appDir := getAppDir()
	return filepath.Join(appDir, "playit.exe")
}

// getRcloneConfig returns the absolute path to rclone.conf
func getRcloneConfig() string {
	appDir := getAppDir()
	return filepath.Join(appDir, "rclone.conf")
}

// Startup is called when the app starts.
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx

	// --- DATABASE CONNECTION TEST ---
	// TODO: Replace this string with your actual MongoDB Connection String
	connStr := "mongodb+srv://shouvik9876:9674350711%40@cluster0.j3d6lug.mongodb.net/"

	_, err := ConnectDB(connStr)
	if err != nil {
		a.Log(fmt.Sprintf("❌ CRITICAL: Database connection failed: %v", err))
	}
	// --------------------------------

	a.SeedVersions()
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's showtime!", name)
}

// --- AUTHENTICATION METHODS ---

// Register creates a new user in MongoDB
func (a *App) Register(username string, password string) string {
	collection := DB.Client.Database("mc_roam").Collection("users")

	// 1. Check if user already exists
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var existingUser User
	err := collection.FindOne(ctx, bson.M{"username": username}).Decode(&existingUser)
	if err == nil {
		return "Error: Username already exists"
	}

	// 2. Hash the password
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	if err != nil {
		return "Error: Could not hash password"
	}

	// 3. Create the user object
	newUser := User{
		Username:     username,
		PasswordHash: string(hashedBytes),
	}

	// 4. Insert into DB
	_, err = collection.InsertOne(ctx, newUser)
	if err != nil {
		return fmt.Sprintf("Error: Database insert failed: %v", err)
	}

	return "Success: User registered!"
}

// Login verifies credentials
func (a *App) Login(username string, password string) string {
	collection := DB.Client.Database("mc_roam").Collection("users")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Find the user
	var user User
	err := collection.FindOne(ctx, bson.M{"username": username}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return "Error: User not found"
	} else if err != nil {
		return "Error: Database error"
	}

	// 2. Compare the password with the hash
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return "Error: Invalid password"
	}

	return "Success: Logged in as " + user.Username
}

// --- SERVER MANAGEMENT METHODS ---

// CreateServer creates a new server group (UPDATED)
func (a *App) CreateServer(serverName string, serverType string, version string, ownerUsername string, configString string) string {
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
		return fmt.Sprintf("Error: Failed to create server: %v", err)
	}
	return newID // Return the server ID for frontend to use
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

	// Map owner_id to owner for frontend compatibility
	for i := range servers {
		servers[i].Owner = servers[i].OwnerID
	}

	return servers
}

// Helper to generate a random code (e.g., "AB12")
func generateInviteCode() string {
	// Simple timestamp-based unique string for now
	return fmt.Sprintf("%d", time.Now().UnixNano())[10:]
}

// JoinServer adds the user to a server using an invite code
func (a *App) JoinServer(inviteCode string, username string) string {
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Find the server with this code
	var server ServerGroup
	err := collection.FindOne(ctx, bson.M{"invite_code": inviteCode}).Decode(&server)
	if err != nil {
		return "Error: Invalid invite code"
	}

	// 2. Check if user is already a member
	for _, member := range server.Members {
		if member == username {
			return "Error: You are already in this server"
		}
	}

	// 3. Add user to the members list
	update := bson.M{"$push": bson.M{"members": username}}
	_, err = collection.UpdateOne(ctx, bson.M{"_id": server.ID}, update)
	if err != nil {
		return "Error: Failed to join server"
	}

	return "Success: Joined " + server.Name
}

// --- POWER MANAGEMENT METHODS ---

// StartServer attempts to acquire the lock and launch the specific instance
// Add this helper if you haven't already
func (a *App) Log(message string) {
	fmt.Println(message) // Print to VS Code
	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, "server-log", message) // Send to Frontend
	}
}

// SendConsoleCommand injects a command into the running Minecraft server
func (a *App) SendConsoleCommand(serverID string, command string) string {
	// Security: Only allow if this is the currently running server
	// (In a multi-server app, you'd check a map of activeCmds.
	// For now, we use the global activeCmd/stdinPipe you set up earlier)

	if activeCmd == nil || stdinPipe == nil {
		return "Error: Server is not online."
	}

	// Write command to stdin (Minecraft console)
	// Note: Minecraft commands need a newline "\n" at the end
	_, err := stdinPipe.Write([]byte(command + "\n"))
	if err != nil {
		return "Error: Failed to send command."
	}

	a.Log("💻 Command Sent: " + command)
	return "Success"
}

// SaveWorldSetting saves a world setting to the database (So the UI remembers your toggles)
func (a *App) SaveWorldSetting(serverID string, key string, value interface{}) string {
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx := context.TODO()

	// Update specific field in the map: world_settings.keepInventory
	updateField := fmt.Sprintf("world_settings.%s", key)

	_, err := collection.UpdateOne(ctx, bson.M{"_id": serverID}, bson.M{
		"$set": bson.M{updateField: value},
	})

	if err != nil {
		return "Error saving setting"
	}
	return "Success"
}

// StartServer attempts to acquire the lock for a server
func (a *App) StartServer(serverID string, username string) string {
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Fetch Server from DB
	var serverDoc ServerGroup
	err := collection.FindOne(ctx, bson.M{"_id": serverID}).Decode(&serverDoc)
	if err != nil {
		return "Error: Server not found."
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
				return "Error writing shared credentials: " + err.Error()
			}
			a.Log("✅ Cloud credentials configured successfully!")
		} else {
			return "Error: No cloud credentials found for this server."
		}
	} else {
		// Config exists, but ensure it's up to date with server's config
		if serverDoc.RcloneConfig != "" {
			err = a.InjectConfig(serverDoc.RcloneConfig)
			if err != nil {
				return "Error: Failed to inject cloud keys."
			}
		} else {
			return "Error: This server has no Cloud Config set up!"
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
		return "Error: Database connection failed"
	}
	if result.ModifiedCount == 0 {
		return "Error: Server is already running (Locked by someone else)!"
	}

	// --- PATH CALCULATION ---
	localInstance := a.getInstancePath(serverID)
	remoteFolder := "server-" + serverID

	// 4. Pre-Check Cloud Status
	if !a.CheckCloudExists(remoteFolder) {
		a.forceUnlock(serverID)
		return "Error: directory not found (setup required)"
	}

	// 5. Trigger Sync Down
	a.Log("🔄 Syncing (down)...")
	// Clean locks BEFORE sync to avoid Access Denied errors
	a.CleanLocks(localInstance)

	err = a.RunSync(SyncDown, remoteFolder, localInstance)
	if err != nil {
		a.forceUnlock(serverID)
		return fmt.Sprintf("Error: Sync failed: %v", err)
	}

	// 5.5. Check if server.jar exists (First-time setup check)
	serverJarPath := filepath.Join(localInstance, "server.jar")
	if _, err := os.Stat(serverJarPath); os.IsNotExist(err) {
		a.Log("📦 First-time setup detected. Downloading server files...")
		installResult := a.InstallServer(serverID)
		if !strings.HasPrefix(installResult, "Success") {
			a.forceUnlock(serverID)
			return "Error: Installation failed: " + installResult
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
		return fmt.Sprintf("Error: Failed to launch: %v", err)
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
	return fmt.Sprintf("Success:%d", port)
}

// StopServer syncs data BACK to the specific cloud folder
func (a *App) StopServer(serverID string, username string) string {

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
		return "Error: You are not the host, or server is already stopped."
	}

	// 3. Sync Up (Push)
	// Check if the instance folder exists locally
	if _, err := os.Stat(localInstance); err == nil {
		a.Log("🚀 Starting Upload (Sync Up)...")

		// Syncing: ./instances/123 -> server-123 (Cloud)
		err = a.RunSync(SyncUp, remoteFolder, localInstance)
		if err != nil {
			return fmt.Sprintf("Error: Upload failed! Data NOT saved. (%v)", err)
		}
		a.Log("✅ Upload Complete!")
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
		return "Error: Database update failed (but files were synced!)"
	}

	return "Success: Server Stopped & Saved!"
}

// AuthorizeDrive runs the interactive Rclone login flow
// It returns the full config string (not just the token)
func (a *App) AuthorizeDrive(clientID string, clientSecret string) string {
	rcloneBin := getToolPath("rclone.exe")

	// 1. Use default keys if user didn't provide custom ones
	// (You can hardcode your keys here so friends don't need to type them!)
	if clientID == "" {
		clientID = "591449617847-e8dutllhdbipah552jtfn0snm03qdkr3.apps.googleusercontent.com"
	}
	if clientSecret == "" {
		clientSecret = "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"
	}

	// 2. Run: rclone authorize "drive" "id" "secret"
	// This command opens the browser AUTOMATICALLY.
	cmd := exec.Command(rcloneBin, "authorize", "drive", clientID, clientSecret)

	// We need to capture the output (the token JSON)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Sprintf("Error: Auth failed. Did you close the browser? (%v)", err)
	}

	// 3. Parse the output to find the JSON token
	// Rclone prints some text like "Paste the following in your shell..."
	// The token is the JSON part bounded by { ... }
	tokenJSON := string(output)

	// Simple cleanup: Rclone output usually ends with the JSON.
	// We'll just construct the config using the whole output string as the token
	// (or you might need to trim it if rclone is chatty, but usually it works).

	// Let's trim whitespace just in case
	tokenJSON = strings.TrimSpace(tokenJSON)
	// Sometimes rclone prints "Paste this:" before the JSON. We need to strip that if present.
	// A simple hack: find the first '{' and the last '}'
	start := strings.Index(tokenJSON, "{")
	end := strings.LastIndex(tokenJSON, "}")

	if start != -1 && end != -1 {
		tokenJSON = tokenJSON[start : end+1]
	} else {
		return "Error: Could not find token in Rclone output."
	}

	// 4. Construct the Final Config
	configTemplate := `[mc-remote]
type = drive
scope = drive
client_id = %s
client_secret = %s
token = %s
`
	return fmt.Sprintf(configTemplate, clientID, clientSecret, tokenJSON)
}

// Update this function to accept the folder name!
func (a *App) CheckCloudExists(folderName string) bool {
	// Construct the path: mc-remote:server-123
	fullPath := "mc-remote:" + folderName
	cmd := exec.Command(getToolPath("rclone.exe"), "lsd", fullPath, "--config", getRcloneConfig())
	if err := cmd.Run(); err != nil {
		return false
	}
	return true
}

// forceUnlock resets the server status without syncing files
func (a *App) forceUnlock(serverID string) {
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"_id": serverID}
	update := bson.M{
		"$set": bson.M{
			"lock.is_running": false,
			"lock.hosted_by":  "",
			"lock.hosted_at":  time.Time{},
			"lock.port":       0,
		},
	}
	collection.UpdateOne(ctx, filter, update)
}

// StopTunnel stops the playit.exe tunnel process
func (a *App) StopTunnel() error {
	a.Log("🛑 Stopping Playit tunnel...")

	// Kill all playit.exe processes
	cmd := exec.Command("taskkill", "/F", "/IM", "playit.exe")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	if err := cmd.Run(); err != nil {
		// Process might not be running, which is fine
		a.Log("⚠️ No Playit tunnel found (may already be stopped)")
		return nil
	}

	a.Log("✅ Playit tunnel stopped")
	return nil
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

// CheckUserHasPlayit returns true if user has playit config in their account
func (a *App) CheckUserHasPlayit(username string) bool {
	collection := DB.Client.Database("mc_roam").Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user User
	err := collection.FindOne(ctx, bson.M{"username": username}).Decode(&user)
	if err != nil {
		return false
	}

	return user.PlayitTomlContent != ""
}

// ForceSyncUp is called after setup to ensure config files are saved to cloud
func (a *App) ForceSyncUp(serverID string) string {
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var server ServerGroup
	err := collection.FindOne(ctx, bson.M{"_id": serverID}).Decode(&server)
	if err != nil {
		return "Error: Server not found"
	}

	// Get paths
	localPath := a.getInstancePath(serverID)
	remotePath := "server-" + serverID

	a.Log("☁️ Uploading Initial Configuration...")
	err = a.RunSync(SyncUp, remotePath, localPath)
	if err != nil {
		return "Error syncing: " + err.Error()
	}
	return "Success"
}

// getInstancePath generates a unique folder for each server locally using absolute path
func (a *App) getInstancePath(serverID string) string {
	dataDir := ensureDataDir()
	return filepath.Join(dataDir, "instances", serverID)
}

// DeleteServer removes the server from DB, Local Disk, and Cloud
func (a *App) DeleteServer(serverID string, username string) string {
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Fetch Server to check ownership
	var serverDoc ServerGroup
	err := collection.FindOne(ctx, bson.M{"_id": serverID}).Decode(&serverDoc)
	if err != nil {
		return "Error: Server not found."
	}

	// 2. SECURITY CHECK (The Fix)
	// We check 'OwnerID' because that is what is stored in your MongoDB
	if serverDoc.OwnerID != username {
		return "Error: Only the server owner can delete this server."
	}

	// 3. Safety Check: Is it running?
	if serverDoc.Lock.IsRunning {
		return "Error: Stop the server before deleting it."
	}

	// 4. Delete from Database
	_, err = collection.DeleteOne(ctx, bson.M{"_id": serverID})
	if err != nil {
		return "Error: Failed to delete from DB."
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

	return "Success"
}
