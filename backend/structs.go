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
	Members []string `bson:"members" json:"members"` // List of Usernames

	// The "Traffic Light" Lock
	Lock ServerLock `bson:"lock" json:"lock"`

	// Invite Code (Simple lookup)
	InviteCode string `bson:"invite_code" json:"invite_code"`
}

type ServerLock struct {
	IsRunning bool      `bson:"is_running" json:"is_running"`
	HostedBy  string    `bson:"hosted_by" json:"hosted_by"`
	HostedAt  time.Time `bson:"hosted_at" json:"hosted_at"`
	IPAddress string    `bson:"ip_address" json:"ip_address"`
}
