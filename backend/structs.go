package backend

import "time"

// User represents a player in the system
type User struct {
	ID           string `bson:"_id,omitempty" json:"id"`
	Username     string `bson:"username" json:"username"`
	PasswordHash string `bson:"password_hash" json:"-"` // "-" means never send this to Frontend
}

// --- ADD THIS BELOW ---

// ServerGroup represents a Minecraft Server Group
type ServerGroup struct {
	ID      string   `bson:"_id,omitempty" json:"id"`
	Name    string   `bson:"name" json:"name"`
	OwnerID string   `bson:"owner_id" json:"owner_id"`
	Owner   string   `bson:"-" json:"owner"` // Computed field, not stored in DB
	Members []string `bson:"members" json:"members"`

	// --- NEW FIELD ---
	// Stores the entire content of rclone.conf
	RcloneConfig string `bson:"rclone_config" json:"-"` // JSON "-" means don't send to frontend UI for safety
	// -----------------

	Lock       ServerLock `bson:"lock" json:"lock"`
	InviteCode string     `bson:"invite_code" json:"invite_code"`
}

type ServerLock struct {
	IsRunning bool      `bson:"is_running" json:"is_running"`
	HostedBy  string    `bson:"hosted_by" json:"hosted_by"`
	HostedAt  time.Time `bson:"hosted_at" json:"hosted_at"`
	IPAddress string    `bson:"ip_address" json:"ip_address"`
}
