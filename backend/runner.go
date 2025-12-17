package backend

import (
	"bufio"
	"fmt"
	"io"
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
var stdinPipe io.WriteCloser

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

// FindProcessLockingFile uses Windows handle.exe to find what's locking a file
func (a *App) FindProcessLockingFile(filePath string) []int {
	// Try using PowerShell's Get-Process with handle checking
	cmd := exec.Command("powershell", "-Command",
		fmt.Sprintf(`Get-Process | Where-Object {$_.Modules.FileName -like "*%s*"} | Select-Object -ExpandProperty Id`, filepath.Base(filePath)))

	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil
	}

	var pids []int
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if pid, err := strconv.Atoi(line); err == nil && pid > 0 {
			pids = append(pids, pid)
		}
	}
	return pids
}

// KillProcessesLockingLogs finds and kills any Java processes holding log files
func (a *App) KillProcessesLockingLogs(serverDir string) {
	logFile := filepath.Join(serverDir, "logs", "latest.log")

	// Method 1: Kill all java.exe processes in this directory
	cmd := exec.Command("powershell", "-Command",
		fmt.Sprintf(`Get-Process java -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*%s*"} | Stop-Process -Force`,
			strings.ReplaceAll(serverDir, "\\", "\\\\")))

	output, err := cmd.CombinedOutput()
	if err == nil {
		a.Log("🧹 Killed lingering Java processes")
	} else {
		a.Log(fmt.Sprintf("⚠️ Java cleanup: %s", string(output)))
	}

	// Method 2: Try to delete the log file (might fail, that's OK)
	os.Remove(logFile)

	time.Sleep(2 * time.Second) // Wait for handles to release
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
	// 1. KILL ZOMBIE FIRST
	a.KillZombie(serverDir)

	// 2. KILL LINGERING JAVA PROCESSES HOLDING LOG FILES
	a.KillProcessesLockingLogs(serverDir)

	// 3. CLEAN FILE LOCKS
	a.CleanLocks(serverDir)

	// 4. FORCE KILL PORT
	a.ForceKillPort(port)

	// 5. Wait longer for OS to fully release resources
	time.Sleep(2 * time.Second)

	// 6. Set Port in Config
	err := a.UpdateServerProperties(serverDir, port)
	if err != nil {
		a.Log(fmt.Sprintf("⚠️ Failed to update port: %v", err))
	}

	jarName := "server.jar"
	if _, err := os.Stat(filepath.Join(serverDir, jarName)); os.IsNotExist(err) {
		return fmt.Errorf("server.jar not found")
	}

	// 7. Command
	cmd := exec.Command("java", "-Xmx2G", "-Xms2G", "-jar", jarName, "nogui")
	cmd.Dir = serverDir

	// 8. Get stdin pipe for graceful shutdown
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return err
	}
	stdinPipe = stdin

	// 9. LOG STREAMING MAGIC
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

	// 10. Save PID
	pidFile := filepath.Join(serverDir, "server.pid")
	os.WriteFile(pidFile, []byte(strconv.Itoa(cmd.Process.Pid)), 0644)

	go func() {
		cmd.Wait()
		a.Log("🛑 Minecraft Server Exited.")
		activeCmd = nil
		stdinPipe = nil
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
	pid, err := strconv.Atoi(strings.TrimSpace(string(data)))
	if err != nil {
		return
	}

	a.Log(fmt.Sprintf("🧟 Found Zombie Process (PID: %d). Killing it...", pid))

	// Try graceful shutdown first
	exec.Command("taskkill", "/PID", strconv.Itoa(pid)).Run()
	time.Sleep(3 * time.Second)

	// Force kill if still alive
	exec.Command("taskkill", "/F", "/PID", strconv.Itoa(pid)).Run()
	time.Sleep(1 * time.Second)

	os.Remove(pidPath)
}

// CleanLocks deletes files that cause "FileSystemException"
func (a *App) CleanLocks(serverDir string) {
	targets := []string{
		filepath.Join(serverDir, "world", "session.lock"),
		filepath.Join(serverDir, "world_nether", "session.lock"),
		filepath.Join(serverDir, "world_the_end", "session.lock"),
		filepath.Join(serverDir, "logs", "latest.log"),
		filepath.Join(serverDir, "logs", "latest.log.lck"),
	}

	for _, path := range targets {
		// Try multiple times for stubborn files
		for i := 0; i < 3; i++ {
			if err := os.Remove(path); err == nil {
				a.Log(fmt.Sprintf("🧹 Cleaned lock: %s", path))
				break
			}
			time.Sleep(500 * time.Millisecond)
		}
	}
	a.Log("✅ Lock cleanup complete")
}

// KillMinecraftServer (Manual Stop from UI) - GRACEFUL SHUTDOWN
func (a *App) KillMinecraftServer() error {
	if activeCmd != nil && activeCmd.Process != nil {
		a.Log("🛑 Gracefully stopping Minecraft server...")

		// Send "stop" command to the server (graceful shutdown)
		if stdinPipe != nil {
			stdinPipe.Write([]byte("stop\n"))
			stdinPipe.Close()

			// Wait up to 10 seconds for graceful shutdown
			done := make(chan error, 1)
			go func() {
				done <- activeCmd.Wait()
			}()

			select {
			case <-done:
				a.Log("✅ Server stopped gracefully")
				return nil
			case <-time.After(10 * time.Second):
				a.Log("⚠️ Graceful shutdown timed out, force killing...")
				return activeCmd.Process.Kill()
			}
		}

		// Fallback to force kill
		return activeCmd.Process.Kill()
	}
	return nil
}
