package backend

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// Global variable to hold the running Minecraft process
// In a production app, we might map ServerID -> Process if allowing multiple servers.
var activeCmd *exec.Cmd

// RunMinecraftServer launches the server.jar
func (a *App) RunMinecraftServer() error {
	serverDir := "./minecraft_server"
	jarName := "server.jar" // We assume the user named it this

	// 1. check if jar exists
	if _, err := os.Stat(filepath.Join(serverDir, jarName)); os.IsNotExist(err) {
		return fmt.Errorf("server.jar not found in %s", serverDir)
	}

	// 2. Prepare the command: java -Xmx2G -Xms2G -jar server.jar nogui
	// You can make RAM configurable later!
	cmd := exec.Command("java", "-Xmx2G", "-Xms2G", "-jar", jarName, "nogui")
	cmd.Dir = serverDir // Important: Run inside the folder

	// 3. Pipe the output (Stdout/Stderr) so we can see it
	// For now, we print to VS Code terminal. Later we send to Frontend.
	cmdReader, _ := cmd.StdoutPipe()
	scanner := bufio.NewScanner(cmdReader)
	go func() {
		for scanner.Scan() {
			fmt.Printf("[MC]: %s\n", scanner.Text())
			// TODO: a.runtime.EventsEmit("console_log", scanner.Text())
		}
	}()

	cmd.Stderr = cmd.Stdout // Capture errors too

	// 4. Start the process
	if err := cmd.Start(); err != nil {
		return err
	}

	activeCmd = cmd
	fmt.Println("✅ Minecraft Server Launched!")

	// 5. Wait for it to finish (in a goroutine so we don't block the UI)
	go func() {
		cmd.Wait()
		fmt.Println("🛑 Minecraft Server Exited.")
		activeCmd = nil
	}()

	return nil
}

// KillMinecraftServer forcefully stops the process
func (a *App) KillMinecraftServer() error {
	if activeCmd != nil && activeCmd.Process != nil {
		return activeCmd.Process.Kill()
	}
	return nil
}
