package backend

import (
	"context"
	"fmt"
	"os"
	"time"

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

// Startup is called when the app starts.
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx

	// --- DATABASE CONNECTION TEST ---
	// TODO: Replace this string with your actual MongoDB Connection String
	connStr := "mongodb+srv://shouvik9876:9674350711%40@cluster0.j3d6lug.mongodb.net/"

	_, err := ConnectDB(connStr)
	if err != nil {
		fmt.Printf("❌ CRITICAL: Database connection failed: %v\n", err)
	}
	// --------------------------------
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
func (a *App) CreateServer(serverName string, ownerUsername string, configString string) string {
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	newID := fmt.Sprintf("srv_%d", time.Now().UnixNano())

	newServer := ServerGroup{
		ID:           newID,
		Name:         serverName,
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
	return "Success: Server created!"
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

// StartServer attempts to acquire the lock for a server
func (a *App) StartServer(serverID string, username string) string {
	collection := DB.Client.Database("mc_roam").Collection("servers")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. The Filter (Existing code...)
	filter := bson.M{"_id": serverID, "lock.is_running": false}

	// --- NEW: FETCH CONFIG FIRST ---
	var serverDoc ServerGroup
	// We need to find the doc to get the RcloneConfig string
	// Note: This is a separate read before the write.
	// Ideally we do this atomically, but for now this is fine.
	err := collection.FindOne(ctx, bson.M{"_id": serverID}).Decode(&serverDoc)
	if err != nil {
		return "Error: Server not found."
	}

	// INJECT THE CONFIG!
	if serverDoc.RcloneConfig == "" {
		return "Error: This server has no Cloud Config set up!"
	}
	err = a.InjectConfig(serverDoc.RcloneConfig)
	if err != nil {
		return "Error: Failed to inject cloud keys."
	}
	// -------------------------------

	// 2. The Update: Set running=true, host=me
	update := bson.M{
		"$set": bson.M{
			"lock.is_running": true,
			"lock.hosted_by":  username,
			"lock.hosted_at":  time.Now(),
			// Later we will add IP address here from Playit
		},
	}

	// 3. Execute
	result, err := collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return "Error: Database connection failed"
	}
	if result.ModifiedCount == 0 {
		return "Error: Server is already running (Locked by someone else)!"
	}

	if result.ModifiedCount == 0 {
		return "Error: Server is already running!"
	}

	// --- NEW: TRIGGER SYNC ---
	// 1. Ensure local world folder exists
	localServer := "./minecraft_server"
	EnsureLocalFolder(localServer)

	// 2. Pull data from Cloud (Sync Down)
	// We are syncing the 'world' folder from the remote
	// err = a.RunSync(SyncDown, "minecraft-server", localServer)
	// if err != nil {
	// 	// If sync fails, release the lock immediately so we aren't stuck
	// 	a.StopServer(serverID, username)
	// 	return fmt.Sprintf("Error: Sync failed: %v", err)
	// }
	// --- NEW: LAUNCH THE GAME ---
	err = a.RunMinecraftServer()
	if err != nil {
		// If launch fails, we must upload changes (if any) and unlock
		a.StopServer(serverID, username)
		return fmt.Sprintf("Error: Failed to launch server.jar: %v", err)
	}

	return "Success: Server Started & Running!"
}

// StopServer syncs data BACK to cloud, then releases the lock
func (a *App) StopServer(serverID string, username string) string {

	// 1. Kill the process first!
	a.KillMinecraftServer()
	// Give it a second to release file locks
	time.Sleep(2 * time.Second)

	collection := DB.Client.Database("mc_roam").Collection("servers")
	// Give it 10 minutes to upload large files before giving up on the DB update
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	// 1. Verify we are the host
	filter := bson.M{
		"_id":             serverID,
		"lock.is_running": true,
		"lock.hosted_by":  username,
	}

	// Check existence before we do the heavy lifting
	var result ServerGroup
	err := collection.FindOne(ctx, filter).Decode(&result)
	if err != nil {
		return "Error: You are not the host, or server is already stopped."
	}

	// --- NEW: TRIGGER SYNC UP (PUSH) ---
	localServer := "./minecraft_server"

	// Check if world actually exists before trying to upload
	if _, err := os.Stat(localServer); err == nil {
		fmt.Println("🚀 Starting Upload (Sync Up)...")

		// Run Rclone: Local -> Cloud
		err = a.RunSync(SyncUp, "minecraft-server", localServer)
		if err != nil {
			return fmt.Sprintf("Error: Upload failed! Data NOT saved. (%v)", err)
		}
		fmt.Println("✅ Upload Complete!")
	}
	// -----------------------------------

	// 2. Release the Lock (Only after sync succeeds!)
	update := bson.M{
		"$set": bson.M{
			"lock.is_running": false,
			"lock.hosted_by":  "",
			"lock.hosted_at":  time.Time{}, // Reset time
		},
	}

	_, err = collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return "Error: Database update failed (but files were synced!)"
	}

	return "Success: Server Stopped & Saved!"
}
