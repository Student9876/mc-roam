package backend

import "time"

// User represents a player in the system
type User struct {
	ID           string `bson:"_id,omitempty" json:"id"`
	Username     string `bson:"username" json:"username"`
	PasswordHash string `bson:"password_hash" json:"-"` // "-" means never send this to Frontend
}

// --- ADD THIS BELOW ---

// ServerVersion represents a downloadable jar file
type ServerVersion struct {
	ID      string `bson:"_id,omitempty" json:"id"`
	Version string `bson:"version" json:"version"` // e.g., "1.20.4"
	Type    string `bson:"type" json:"type"`       // e.g., "Paper", "Vanilla"
	Url     string `bson:"url" json:"url"`         // Direct download link
}

// ServerGroup represents a Minecraft Server Group
type ServerGroup struct {
	ID   string `bson:"_id" json:"id"`
	Name string `bson:"name" json:"name"`

	// --- NEW FIELDS ---
	Type    string `bson:"type" json:"type"`       // e.g. "Paper"
	Version string `bson:"version" json:"version"` // e.g. "1.20.4"
	// ------------------

	InviteCode    string                 `bson:"invite_code" json:"invite_code"`
	OwnerID       string                 `bson:"owner_id" json:"owner_id"`
	Owner         string                 `bson:"-" json:"owner"`
	Members       []string               `bson:"members" json:"members"`
	RcloneConfig  string                 `bson:"rclone_config" json:"-"`
	WorldSettings map[string]interface{} `bson:"world_settings" json:"world_settings"` // Stores { "keepInventory": true, "difficulty": "hard" }
	Lock          ServerLock             `bson:"lock" json:"lock"`
}

type ServerLock struct {
	IsRunning bool      `bson:"is_running" json:"is_running"`
	HostedBy  string    `bson:"hosted_by" json:"hosted_by"`
	HostedAt  time.Time `bson:"hosted_at" json:"hosted_at"`
	IPAddress string    `bson:"ip_address" json:"ip_address"`
	Port      int       `bson:"port" json:"port"` // Active port (25565 or fallback)
}
