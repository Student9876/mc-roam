package backend

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

// getToolPath returns the absolute path to a tool in the bin folder
func getToolPath(toolName string) string {
	appDir := getAppDir()
	return filepath.Join(appDir, "bin", toolName)
}

// CheckDependencies verifies if all required tools exist
func (a *App) CheckDependencies() bool {
	rclonePath := getToolPath("rclone.exe")
	if _, err := os.Stat(rclonePath); os.IsNotExist(err) {
		a.Log("⚠️ Missing: rclone.exe")
		return false
	}
	a.Log("✅ All dependencies present")
	return true
}

// InstallDependencies downloads and installs missing tools
func (a *App) InstallDependencies() error {
	binDir := filepath.Join(getAppDir(), "bin")
	os.MkdirAll(binDir, 0755)

	// Check if rclone is missing
	rclonePath := getToolPath("rclone.exe")
	if _, err := os.Stat(rclonePath); os.IsNotExist(err) {
		a.Log("⬇️ Downloading Rclone core tools...")
		if err := a.downloadRclone(binDir); err != nil {
			return fmt.Errorf("failed to install rclone: %v", err)
		}
	}

	a.Log("✅ All dependencies installed successfully!")
	return nil
}

// downloadRclone fetches the official Rclone zip and extracts rclone.exe
func (a *App) downloadRclone(binDir string) error {
	url := "https://downloads.rclone.org/v1.66.0/rclone-v1.66.0-windows-amd64.zip"

	// Download the Zip
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("download failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("download failed with status: %d", resp.StatusCode)
	}

	a.Log("📦 Extracting Rclone...")

	// Read the body into memory
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read download: %v", err)
	}

	// Open Zip
	zipReader, err := zip.NewReader(bytes.NewReader(bodyBytes), int64(len(bodyBytes)))
	if err != nil {
		return fmt.Errorf("failed to read zip: %v", err)
	}

	// Find and extract rclone.exe (it's usually inside a folder)
	for _, file := range zipReader.File {
		if filepath.Base(file.Name) == "rclone.exe" {
			// Found it! Extract it.
			zippedFile, err := file.Open()
			if err != nil {
				return fmt.Errorf("failed to open file in zip: %v", err)
			}
			defer zippedFile.Close()

			targetPath := filepath.Join(binDir, "rclone.exe")
			outputFile, err := os.Create(targetPath)
			if err != nil {
				return fmt.Errorf("failed to create target file: %v", err)
			}
			defer outputFile.Close()

			_, err = io.Copy(outputFile, zippedFile)
			if err != nil {
				return fmt.Errorf("failed to write file: %v", err)
			}

			a.Log("✅ Rclone installed successfully!")
			return nil
		}
	}

	return fmt.Errorf("rclone.exe not found in downloaded zip")
}
