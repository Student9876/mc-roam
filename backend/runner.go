package backend

import (
	"bufio"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// Global variable for the current session
var activeCmd *exec.Cmd

// GetFreePort asks the OS for a random free port
func GetFreePort() (int, error) {
	addr, err := net.ResolveTCPAddr("tcp", "localhost:0")
	if err != nil {
		return 0, err
	}
	l, err := net.ListenTCP("tcp", addr)
	if err != nil {
		return 0, err
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port, nil
}

// UpdateServerProperties forces the server-port setting
func (a *App) UpdateServerProperties(serverDir string, port int) error {
	propsPath := filepath.Join(serverDir, "server.properties")
	content, err := os.ReadFile(propsPath)
	if err != nil {
		return err // Might not exist yet, that's fine
	}

	lines := strings.Split(string(content), "\n")
	var newLines []string
	found := false

	for _, line := range lines {
		if strings.HasPrefix(line, "server-port=") {
			newLines = append(newLines, fmt.Sprintf("server-port=%d", port))
			found = true
		} else if strings.HasPrefix(line, "query.port=") {
			newLines = append(newLines, fmt.Sprintf("query.port=%d", port))
		} else {
			newLines = append(newLines, line)
		}
	}
	if !found {
		newLines = append(newLines, fmt.Sprintf("server-port=%d", port))
	}
	return os.WriteFile(propsPath, []byte(strings.Join(newLines, "\n")), 0644)
}

// ForceKillPort finds any process listening on the given port and kills it
func (a *App) ForceKillPort(port int) {
	// Command: netstat -ano | findstr :<PORT>
	cmd := exec.Command("cmd", "/C", fmt.Sprintf("netstat -ano | findstr :%d", port))
	output, err := cmd.CombinedOutput()

	if err != nil || len(output) == 0 {
		return // Port is free
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		parts := strings.Fields(line)
		// Look for lines ending with PID
		if len(parts) >= 5 && strings.Contains(parts[1], fmt.Sprintf(":%d", port)) {
			pidStr := parts[len(parts)-1]
			pid, err := strconv.Atoi(pidStr)
			if err == nil && pid > 0 {
				a.Log(fmt.Sprintf("☢️ Port %d is occupied by PID %d. Killing it...", port, pid))
				exec.Command("taskkill", "/F", "/PID", pidStr).Run()
			}
		}
	}
	time.Sleep(1 * time.Second) // Wait for release
}

// RunMinecraftServer launches the server on a dynamic port and streams logs
func (a *App) RunMinecraftServer(serverDir string, port int) error {
	// 1. KILL ZOMBIE FIRST (before anything else)
	a.KillZombie(serverDir)

	// 2. CLEAN FILE LOCKS (before port cleanup)
	a.CleanLocks(serverDir)

	// 3. FORCE KILL PORT (after zombie is dead)
	a.ForceKillPort(port)

	// 4. Wait a bit longer for OS to fully release resources
	time.Sleep(2 * time.Second)

	// 2. Set Port in Config
	err := a.UpdateServerProperties(serverDir, port)
	if err != nil {
		a.Log(fmt.Sprintf("⚠️ Failed to update port: %v", err))
	}

	jarName := "server.jar"
	if _, err := os.Stat(filepath.Join(serverDir, jarName)); os.IsNotExist(err) {
		return fmt.Errorf("server.jar not found")
	}

	// 3. Command
	cmd := exec.Command("java", "-Xmx2G", "-Xms2G", "-jar", jarName, "nogui")
	cmd.Dir = serverDir

	// 4. LOG STREAMING MAGIC
	stdout, _ := cmd.StdoutPipe()
	cmd.Stderr = cmd.Stdout // Merge errors into stdout

	if err := cmd.Start(); err != nil {
		return err
	}

	// Read logs in background and send to Frontend
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			text := scanner.Text()
			a.Log("[MC]: " + text)
		}
	}()

	activeCmd = cmd
	a.Log(fmt.Sprintf("✅ Minecraft Server Started on Port %d (PID: %d)", port, cmd.Process.Pid))

	// 5. Save PID
	pidFile := filepath.Join(serverDir, "server.pid")
	os.WriteFile(pidFile, []byte(strconv.Itoa(cmd.Process.Pid)), 0644)

	go func() {
		cmd.Wait()
		a.Log("🛑 Minecraft Server Exited.")
		activeCmd = nil
		os.Remove(pidFile)
	}()

	return nil
}

// KillZombie reads the pid file and forces the process to die
func (a *App) KillZombie(serverDir string) {
	pidPath := filepath.Join(serverDir, "server.pid")
	data, err := os.ReadFile(pidPath)
	if err != nil {
		return
	}
	pid, err := strconv.Atoi(string(data))
	if err != nil {
		return
	}
	process, err := os.FindProcess(pid)
	if err == nil {
		a.Log(fmt.Sprintf("🧟 Found Zombie Process (PID: %d). Killing it...", pid))
		process.Kill()
		process.Wait()
		time.Sleep(1 * time.Second)
	}
	os.Remove(pidPath)
}

// CleanLocks deletes files that cause "FileSystemException"
func (a *App) CleanLocks(serverDir string) {
	targets := []string{
		filepath.Join(serverDir, "world", "session.lock"),
		filepath.Join(serverDir, "world_nether", "session.lock"),
		filepath.Join(serverDir, "world_the_end", "session.lock"),
		filepath.Join(serverDir, "logs", "latest.log"),
		filepath.Join(serverDir, "logs", "latest.log.lck"), // Log4j lock file
	}
	for _, path := range targets {
		if err := os.Remove(path); err == nil {
			a.Log(fmt.Sprintf("🧹 Cleaned lock: %s", path))
		}
	}
	a.Log("✅ Lock cleanup complete")
}

// KillMinecraftServer (Manual Stop from UI)
func (a *App) KillMinecraftServer() error {
	if activeCmd != nil && activeCmd.Process != nil {
		return activeCmd.Process.Kill()
	}
	return nil
}
