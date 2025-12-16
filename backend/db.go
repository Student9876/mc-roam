package backend

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// DBClient holds the active connection
type DBClient struct {
	Client *mongo.Client
}

var DB *DBClient // Global instance (simple for now)

// ConnectDB attempts to connect to MongoDB Cloud
func ConnectDB(connectionString string) (*DBClient, error) {
	// 1. Set a timeout of 10 seconds for the connection attempt
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 2. Configure the client
	clientOptions := options.Client().ApplyURI(connectionString)

	// 3. Connect
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to connect: %v", err)
	}

	// 4. Ping the database to verify the connection is actually alive
	err = client.Ping(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("ping failed: %v", err)
	}

	fmt.Println("✅ Backend: Successfully connected to MongoDB!")

	DB = &DBClient{Client: client}
	return DB, nil
}

// Disconnect closes the connection
func (db *DBClient) Disconnect() {
	if db.Client != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		db.Client.Disconnect(ctx)
		fmt.Println("Backend: MongoDB disconnected.")
	}
}
