package backend

import (
	"encoding/json"
	"os"
	"path/filepath"
)

func (a *App) localWorldSettingsPath(serverID string) string {
	return filepath.Join(a.getInstancePath(serverID), "world_settings.json")
}

func (a *App) saveWorldSettingLocal(serverID string, key string, value interface{}) error {
	instancePath := a.getInstancePath(serverID)
	if err := os.MkdirAll(instancePath, 0755); err != nil {
		return err
	}

	settings := map[string]interface{}{}
	settingsPath := a.localWorldSettingsPath(serverID)

	if data, err := os.ReadFile(settingsPath); err == nil {
		_ = json.Unmarshal(data, &settings)
	}

	settings[key] = value

	out, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(settingsPath, out, 0644)
}

func (a *App) HasLocalServerFiles(serverID string) bool {
	instancePath := a.getInstancePath(serverID)
	if _, err := os.Stat(instancePath); err != nil {
		return false
	}
	if _, err := os.Stat(filepath.Join(instancePath, "server.properties")); err != nil {
		return false
	}
	return true
}

func (a *App) GetLocalWorldSettings(serverID string) map[string]interface{} {
	result := map[string]interface{}{}

	if !a.HasLocalServerFiles(serverID) {
		return result
	}

	props := a.GetServerOptions(serverID)
	result["difficulty"] = props.Difficulty
	result["pvp"] = props.Pvp

	settingsPath := a.localWorldSettingsPath(serverID)
	if data, err := os.ReadFile(settingsPath); err == nil {
		local := map[string]interface{}{}
		if json.Unmarshal(data, &local) == nil {
			for key, value := range local {
				result[key] = value
			}
		}
	}

	return result
}
