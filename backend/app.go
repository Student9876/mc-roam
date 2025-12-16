package backend

import (
	"context"
	"fmt"
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
