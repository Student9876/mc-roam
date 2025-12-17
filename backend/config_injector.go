package backend

import (
	"os"
)

// InjectRcloneConfig creates the rclone.conf file programmatically
// This allows friends to use the app without running 'rclone config' manually.
// InjectConfig writes the server's Rclone credentials to a local file
func (a *App) InjectConfig(configContent string) error {
	// We write to a local file named 'rclone.conf' next to the binary
	configPath := "./rclone.conf"

	// Write the file (0600 means read/write only by the app, for safety)
	err := os.WriteFile(configPath, []byte(configContent), 0600)
	if err != nil {
		return err
	}

	return nil
}
