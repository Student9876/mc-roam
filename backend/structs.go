package backend

// User represents a player in the system
type User struct {
	ID           string `bson:"_id,omitempty" json:"id"`
	Username     string `bson:"username" json:"username"`
	PasswordHash string `bson:"password_hash" json:"-"` // "-" means never send this to Frontend
}
