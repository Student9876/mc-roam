package backend

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"  // Add this
	"go.mongodb.org/mongo-driver/mongo" // Add this
	"golang.org/x/crypto/bcrypt"        // Add this
	"time"
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

// CreateServer creates a new server group
func (a *App) CreateServer(serverName string, ownerUsername string) string {
	collection := DB.Client.Database("mc_roam").Collection("servers")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Create the object
	newServer := ServerGroup{
		Name:       serverName,
		OwnerID:    ownerUsername,
		Members:    []string{ownerUsername}, // Owner is the first member
		InviteCode: generateInviteCode(),    // We'll add this helper below
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
