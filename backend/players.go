package backend

import (
	// "context"
	"encoding/json"
	"os"
	"path/filepath"
	// "time"
)

// PlayerStructs for reading Minecraft JSON files
type PlayerEntry struct {
	UUID    string `json:"uuid"`
	Name    string `json:"name"`
	Level   int    `json:"level,omitempty"`   // For ops.json
	Reason  string `json:"reason,omitempty"`  // For bans
	Created string `json:"created,omitempty"` // For bans
	Source  string `json:"source,omitempty"`  // For bans
	Expires string `json:"expires,omitempty"` // For bans
}

type PlayerLists struct {
	Ops       []PlayerEntry `json:"ops"`
	Whitelist []PlayerEntry `json:"whitelist"`
	Banned    []PlayerEntry `json:"banned"`
	History   []PlayerEntry `json:"history"` // From usercache.json
}

// GetPlayerLists reads all player-related JSON files
func (a *App) GetPlayerLists(serverID string) PlayerLists {
	instanceDir := a.getInstancePath(serverID)

	return PlayerLists{
		Ops:       readJSONFile(filepath.Join(instanceDir, "ops.json")),
		Whitelist: readJSONFile(filepath.Join(instanceDir, "whitelist.json")),
		Banned:    readJSONFile(filepath.Join(instanceDir, "banned-players.json")),
		History:   readJSONFile(filepath.Join(instanceDir, "usercache.json")),
	}
}

// ManagePlayer sends commands to modify lists (ONLY if server is running)
func (a *App) ManagePlayer(serverID string, action string, target string, extra string) string {
	// action: "op", "deop", "whitelist add", "whitelist remove", "ban", "pardon"

	// Check if server is online (Commands require a running server)
	if activeCmd == nil || stdinPipe == nil {
		return "Error: Server must be ONLINE to manage players."
	}

	command := ""
	switch action {
	// --- Management ---
	case "op":
		command = "op " + target
	case "deop":
		command = "deop " + target
	case "whitelist_add":
		command = "whitelist add " + target
	case "whitelist_remove":
		command = "whitelist remove " + target
	case "ban":
		command = "ban " + target
	case "unban":
		command = "pardon " + target
	case "kick":
		command = "kick " + target

	// --- God Mode / Controls ---
	case "kill":
		command = "kill " + target
	case "heal":
		command = "effect give " + target + " minecraft:instant_health 1 255"
	case "feed":
		command = "effect give " + target + " minecraft:saturation 1 255"
	case "starve":
		command = "effect give " + target + " minecraft:hunger 30 255"
	case "gamemode_survival":
		command = "gamemode survival " + target
	case "gamemode_creative":
		command = "gamemode creative " + target
	case "gamemode_spectator":
		command = "gamemode spectator " + target
	case "gamemode_adventure":
		command = "gamemode adventure " + target

	// --- Teleportation ---
	case "teleport_spawn":
		command = "tp " + target + " 0 100 0"
	case "teleport_to_player":
		// Syntax: tp <target> <destination>
		command = "tp " + target + " " + extra
	case "teleport_coords":
		// Syntax: tp <target> x y z
		command = "tp " + target + " " + extra

		return "Error: Unknown action"
	}

	return a.SendConsoleCommand(serverID, command)
}

// Helper to read generic JSON lists
func readJSONFile(path string) []PlayerEntry {
	data, err := os.ReadFile(path)
	if err != nil {
		return []PlayerEntry{} // File might not exist yet
	}

	var list []PlayerEntry
	// Try parsing standard list
	if err := json.Unmarshal(data, &list); err != nil {
		return []PlayerEntry{}
	}
	return list
}
