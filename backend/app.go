package backend

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings" // Add this to imports at top!
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"go.mongodb.org/mongo-driver/bson" // Add this
	// Add this
	// Add this
)

// Build-time variables (set via -ldflags during compilation)
// These will be injected by GitHub Actions from repository secrets
var (
	MongoDBURI         string
	GoogleClientID     string
	GoogleClientSecret string
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
	// ForceSyncUp moved to sync.go for modularization.
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
	// Use build-time injected credentials or environment override
	connStr := os.Getenv("MONGODB_URI")
	if connStr == "" {
		connStr = MongoDBURI // Injected at build time via ldflags
	}
	if connStr == "" {
		// Fallback for development without build flags
		connStr = "mongodb://localhost:27017"
	}

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

// Add this helper if you haven't already
func (a *App) Log(message string) {
	fmt.Println(message) // Print to VS Code
	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, "server-log", message) // Send to Frontend
	}
}

// SendConsoleCommand injects a command into the running Minecraft server
func (a *App) SendConsoleCommand(serverID string, username string, command string) string {
	// Permission check: Only owner or admins can send console commands
	if !a.IsAdmin(serverID, username) {
		return "Error: Only admins can send console commands"
	}

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
func (a *App) SaveWorldSetting(serverID string, username string, key string, value interface{}) string {
	// Permission check: Only owner or admins can modify world settings
	if !a.IsAdmin(serverID, username) {
		return "Error: Only admins can modify world settings"
	}

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

// AuthorizeDrive runs the interactive Rclone login flow
// It returns the full config string (not just the token)
func (a *App) AuthorizeDrive(clientID string, clientSecret string) string {
	rcloneBin := getToolPath("rclone.exe")

	// 1. Use build-time injected credentials or environment override
	// (Credentials are provided by app owner via build process)
	if clientID == "" {
		clientID = os.Getenv("GOOGLE_CLIENT_ID")
		if clientID == "" {
			clientID = GoogleClientID // Injected at build time via ldflags
		}
	}
	if clientSecret == "" {
		clientSecret = os.Getenv("GOOGLE_CLIENT_SECRET")
		if clientSecret == "" {
			clientSecret = GoogleClientSecret // Injected at build time via ldflags
		}
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

// getInstancePath generates a unique folder for each server locally using absolute path
func (a *App) getInstancePath(serverID string) string {
	dataDir := ensureDataDir()
	return filepath.Join(dataDir, "instances", serverID)
}

// ============================================
// ADMIN MANAGEMENT SYSTEM
// ============================================

// IsAdmin checks if a user is owner or admin of a server
func (a *App) IsAdmin(serverID string, username string) bool {
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var server ServerGroup
	err := collection.FindOne(ctx, bson.M{"_id": serverID}).Decode(&server)
	if err != nil {
		return false
	}

	// Owner is always admin
	if server.OwnerID == username {
		return true
	}

	// Check if user is in admins list
	for _, admin := range server.Admins {
		if admin == username {
			return true
		}
	}

	return false
}

// SetAdmin adds a user to the server's admin list
func (a *App) SetAdmin(serverID string, targetUsername string, requesterUsername string) string {
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Fetch server
	var server ServerGroup
	err := collection.FindOne(ctx, bson.M{"_id": serverID}).Decode(&server)
	if err != nil {
		return "Error: Server not found"
	}

	// 2. Only owner can assign admins
	if server.OwnerID != requesterUsername {
		return "Error: Only the server owner can assign admins"
	}

	// 3. Can't admin yourself (owner is already admin by default)
	if targetUsername == requesterUsername {
		return "Error: You are already the owner"
	}

	// 4. Check if target is a member
	isMember := false
	for _, member := range server.Members {
		if member == targetUsername {
			isMember = true
			break
		}
	}
	if !isMember {
		return "Error: User must be a server member first"
	}

	// 5. Check if already admin
	for _, admin := range server.Admins {
		if admin == targetUsername {
			return "Error: User is already an admin"
		}
	}

	// 6. Add to admins list
	_, err = collection.UpdateOne(
		ctx,
		bson.M{"_id": serverID},
		bson.M{"$push": bson.M{"admins": targetUsername}},
	)
	if err != nil {
		return "Error: Failed to update database"
	}

	a.Log(fmt.Sprintf("✅ %s is now an admin of this server", targetUsername))
	return "Success"
}

// RemoveAdmin removes a user from the server's admin list
func (a *App) RemoveAdmin(serverID string, targetUsername string, requesterUsername string) string {
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Fetch server
	var server ServerGroup
	err := collection.FindOne(ctx, bson.M{"_id": serverID}).Decode(&server)
	if err != nil {
		return "Error: Server not found"
	}

	// 2. Only owner can remove admins
	if server.OwnerID != requesterUsername {
		return "Error: Only the server owner can remove admins"
	}

	// 3. Can't remove owner
	if targetUsername == server.OwnerID {
		return "Error: Cannot remove owner from admin status"
	}

	// 4. Remove from admins list
	_, err = collection.UpdateOne(
		ctx,
		bson.M{"_id": serverID},
		bson.M{"$pull": bson.M{"admins": targetUsername}},
	)
	if err != nil {
		return "Error: Failed to update database"
	}

	a.Log(fmt.Sprintf("ℹ️ %s is no longer an admin", targetUsername))
	return "Success"
}

// GetAdmins returns the list of server admins (including owner)
func (a *App) GetAdmins(serverID string) []string {
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var server ServerGroup
	err := collection.FindOne(ctx, bson.M{"_id": serverID}).Decode(&server)
	if err != nil {
		return []string{}
	}

	// Include owner in the list
	admins := []string{server.OwnerID + " (Owner)"}
	admins = append(admins, server.Admins...)

	return admins
}

// DownloadFile is a helper to download a file from a URL and return the response
func DownloadFile(url string) (*http.Response, error) {
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("bad status: %s", resp.Status)
	}
	return resp, nil
}
