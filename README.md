# MC Roam

<div align="center">
  <img src="build/appicon.png" alt="MC Roam Logo" width="200"/>
  
  **Cloud-Synced Multiplayer Minecraft Server Manager**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Build](https://github.com/Student9876/mc-roam/actions/workflows/build.yml/badge.svg)](https://github.com/Student9876/mc-roam/actions)
</div>

## Overview

MC Roam is a powerful desktop application that lets you create, manage, and play Minecraft servers with your friends using cloud storage synchronization. Share servers without port forwarding, play from anywhere, and keep your worlds safe in the cloud.

### Key Features

- **Cloud Sync** - Store server data on Google Drive/OneDrive and sync across machines
- **Multi-Player Hosting** - Anyone in your group can host the server
- **Server Versions** - Support for Vanilla, Paper, and custom server types
- **Real-Time World Settings** - Modify game rules while server is running
- **Player Management** - Op, ban, kick, teleport, and manage players easily
- **Admin System** - Assign trusted members admin privileges
- **Public Tunneling** - Optional Playit.gg integration for public access
- **Built-in Terminal** - Monitor server logs in real-time

## Installation

### Prerequisites

- **Windows 10/11** (64-bit)
- **Rclone-compatible Cloud Storage** (Google Drive, OneDrive, etc.)

### Quick Start

1. **Download** the latest release from [Releases](https://github.com/Student9876/mc-roam/releases)

2. **Run the Application**
   - Double-click `mc-roam.exe`
   - Create an account (no configuration needed!)
   - Authorize your cloud storage (first time only)
   - Create or join a server!

> **Note:** Database and Google Drive integration are provided by the application. No additional setup required!

## Building from Source

### Requirements

- [Go 1.21+](https://go.dev/dl/)
- [Node.js 20+](https://nodejs.org/)
- [Wails v2](https://wails.io/docs/gettingstarted/installation)
- Python 3.x (for icon generation)

### Build Steps

```bash
# Clone repository
git clone https://github.com/Student9876/mc-roam.git
cd mc-roam

# Install Wails
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Install frontend dependencies
cd frontend
npm install
cd ..

# Build
wails build

# Output will be in build/bin/mc-roam.exe
```

> **For Developers:** If you need to override default services (MongoDB, Google OAuth), create a `.env` file with your own credentials. See `.env.example` for details.

## Configuration

### Cloud Storage Setup

1. Go to **Settings** in the app
2. Click **Setup Public Access** (optional)
3. Authorize Rclone with your cloud provider
4. Import configuration

## Usage

### Creating a Server

1. Click **Create Server**
2. Enter server name
3. Select Minecraft version (Vanilla/Paper)
4. Authorize cloud storage
5. Share the invite code with friends

### Joining a Server

1. Click **Join Server**
2. Enter the invite code
3. Wait for host to start the server

### Admin Features

**Server owners can:**
- Assign admin privileges to trusted members
- Delete servers
- Manage all settings

**Admins can:**
- Modify server properties
- Change world settings
- Manage players (op, ban, kick, teleport)
- Send console commands

**Regular members can:**
- Start and stop servers
- Play when server is online

## Project Structure

```
mc-roam/
├── backend/           # Go backend logic
│   ├── app.go        # Main application logic
│   ├── runner.go     # Server execution
│   ├── rclone.go     # Cloud sync
│   ├── playit.go     # Public tunneling
│   └── ...
├── frontend/         # React frontend
│   ├── src/
│   │   ├── pages/    # Dashboard, Auth
│   │   └── components/  # Modals, Cards
│   └── ...
├── build/            # Build assets
├── .github/          # CI/CD workflows
└── README.md
```

## Technologies Used

- **Frontend**: React, Vite
- **Backend**: Go, Wails v2
- **Database**: MongoDB
- **Cloud Sync**: Rclone
- **Tunneling**: Playit.gg

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Security

- **Never commit `.env` files** with real credentials
- MongoDB credentials are environment-based
- Rclone configs are stored per-server in database
- Passwords are bcrypt-hashed

## Troubleshooting

### "Error: Could not connect to MongoDB"
- Check your `MONGODB_URI` in `.env`
- Ensure MongoDB Atlas allows connections from your IP

### "Playit tunnel failed"
- Check firewall settings
- Verify internet connection
- Try re-importing Playit configuration

### "Sync failed"
- Ensure Rclone is properly configured
- Check cloud storage permissions
- Verify internet connection

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Wails](https://wails.io/) - Amazing Go + Web framework
- [Rclone](https://rclone.org/) - Cloud storage sync
- [Playit.gg](https://playit.gg/) - Tunneling service
- [PaperMC](https://papermc.io/) - Optimized Minecraft server

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

Made by [Student9876](https://github.com/Student9876)
