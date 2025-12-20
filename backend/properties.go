package backend

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// ServerProps holds the editable settings
type ServerProps struct {
	MaxPlayers      string `json:"max-players"`
	Gamemode        string `json:"gamemode"`
	Difficulty      string `json:"difficulty"`
	WhiteList       bool   `json:"white-list"`
	OnlineMode      bool   `json:"online-mode"` // "Cracked" in UI
	Pvp             bool   `json:"pvp"`
	EnableCmdBlock  bool   `json:"enable-command-block"`
	AllowFlight     bool   `json:"allow-flight"`
	SpawnAnimals    bool   `json:"spawn-animals"`
	SpawnMonsters   bool   `json:"spawn-monsters"`
	SpawnNpcs       bool   `json:"spawn-npcs"` // Villagers
	AllowNether     bool   `json:"allow-nether"`
	ForceGamemode   bool   `json:"force-gamemode"`
	SpawnProtection string `json:"spawn-protection"`
}

// GetServerOptions reads the server.properties file and returns a struct
func (a *App) GetServerOptions(serverID string) ServerProps {
	// Default values
	props := ServerProps{
		MaxPlayers: "20", Gamemode: "survival", Difficulty: "easy",
		WhiteList: false, OnlineMode: false, Pvp: true,
		EnableCmdBlock: false, AllowFlight: false, SpawnAnimals: true,
		SpawnMonsters: true, SpawnNpcs: true, AllowNether: true,
		ForceGamemode: false, SpawnProtection: "16",
	}

	path := filepath.Join(a.getInstancePath(serverID), "server.properties")
	file, err := os.Open(path)
	if err != nil {
		return props // Return defaults if file missing
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])

		switch key {
		case "max-players":
			props.MaxPlayers = val
		case "gamemode":
			props.Gamemode = val
		case "difficulty":
			props.Difficulty = val
		case "white-list":
			props.WhiteList = (val == "true")
		case "online-mode":
			props.OnlineMode = (val == "true")
		case "pvp":
			props.Pvp = (val == "true")
		case "enable-command-block":
			props.EnableCmdBlock = (val == "true")
		case "allow-flight":
			props.AllowFlight = (val == "true")
		case "spawn-animals":
			props.SpawnAnimals = (val == "true")
		case "spawn-monsters":
			props.SpawnMonsters = (val == "true")
		case "spawn-npcs":
			props.SpawnNpcs = (val == "true")
		case "allow-nether":
			props.AllowNether = (val == "true")
		case "force-gamemode":
			props.ForceGamemode = (val == "true")
		case "spawn-protection":
			props.SpawnProtection = val
		}
	}
	return props
}

// SaveServerOptions writes the struct back to the file
func (a *App) SaveServerOptions(serverID string, username string, props ServerProps) string {
	// Permission check: Only owner or admins can modify server options
	if !a.IsAdmin(serverID, username) {
		return "Error: Only admins can modify server options"
	}

	path := filepath.Join(a.getInstancePath(serverID), "server.properties")

	// We read the whole file to preserve comments and formatting for other keys
	input, err := os.ReadFile(path)
	if err != nil {
		return fmt.Sprintf("Error reading file: %v", err)
	}

	lines := strings.Split(string(input), "\n")
	output := []string{}

	// Create a map of updates
	updates := map[string]string{
		"max-players":          props.MaxPlayers,
		"gamemode":             props.Gamemode,
		"difficulty":           props.Difficulty,
		"white-list":           fmt.Sprintf("%t", props.WhiteList),
		"online-mode":          fmt.Sprintf("%t", props.OnlineMode),
		"pvp":                  fmt.Sprintf("%t", props.Pvp),
		"enable-command-block": fmt.Sprintf("%t", props.EnableCmdBlock),
		"allow-flight":         fmt.Sprintf("%t", props.AllowFlight),
		"spawn-animals":        fmt.Sprintf("%t", props.SpawnAnimals),
		"spawn-monsters":       fmt.Sprintf("%t", props.SpawnMonsters),
		"spawn-npcs":           fmt.Sprintf("%t", props.SpawnNpcs),
		"allow-nether":         fmt.Sprintf("%t", props.AllowNether),
		"force-gamemode":       fmt.Sprintf("%t", props.ForceGamemode),
		"spawn-protection":     props.SpawnProtection,
	}

	// Track which keys we updated so we can add missing ones later
	updatedKeys := make(map[string]bool)

	for _, line := range lines {
		if strings.Contains(line, "=") && !strings.HasPrefix(line, "#") {
			parts := strings.SplitN(line, "=", 2)
			key := strings.TrimSpace(parts[0])

			if newVal, exists := updates[key]; exists {
				output = append(output, fmt.Sprintf("%s=%s", key, newVal))
				updatedKeys[key] = true
				continue
			}
		}
		output = append(output, line)
	}

	// Append any keys that were missing from the original file
	for key, val := range updates {
		if !updatedKeys[key] {
			output = append(output, fmt.Sprintf("%s=%s", key, val))
		}
	}

	err = os.WriteFile(path, []byte(strings.Join(output, "\n")), 0644)
	if err != nil {
		return fmt.Sprintf("Error saving: %v", err)
	}
	return "Success: Settings Saved!"
}
