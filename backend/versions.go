package backend

import (
	"context"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
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

	initialVersions := []interface{}{
		// --- PAPER (Optimized, Plugins) ---
		ServerVersion{Type: "Paper", Version: "1.20.4", Url: "https://api.papermc.io/v2/projects/paper/versions/1.20.4/builds/496/downloads/paper-1.20.4-496.jar"},
		ServerVersion{Type: "Paper", Version: "1.20.2", Url: "https://api.papermc.io/v2/projects/paper/versions/1.20.2/builds/318/downloads/paper-1.20.2-318.jar"},
		ServerVersion{Type: "Paper", Version: "1.19.4", Url: "https://api.papermc.io/v2/projects/paper/versions/1.19.4/builds/550/downloads/paper-1.19.4-550.jar"},

		// --- VANILLA (Standard Mojang) ---
		// Real URLs from piston-meta.mojang.com
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
