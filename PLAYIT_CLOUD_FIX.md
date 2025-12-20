# Playit Connection Error Fix (Error 10054)

## Problem
When deploying Minecraft servers from cloud storage, Playit tunnel fails with:
```
Error: RequestError(RequestError(reqwest::Error { kind: Request, url: "https://api.playit.gg/v1/agents/rundata", 
source: ... ConnectionReset, message: "An existing connection was forcibly closed by the remote host." }))
```

## Root Cause
Windows error 10054 (WSAECONNRESET) occurs when:
1. Network isn't fully ready when Playit starts
2. Firewall blocks outbound connections to api.playit.gg
3. Timing issues between server startup and tunnel initialization
4. SSL/TLS certificate issues on cloud deployments

## Solution Implemented

### 1. **Retry Logic** ([playit.go](backend/playit.go))
- Automatic retry with 3 attempts
- 5-second delay between retries
- Graceful failure with helpful error messages

### 2. **Network Readiness Delay**
- 2-second delay before first tunnel attempt
- 3-second delay after server deployment ([app.go](backend/app.go#L411))
- Ensures server and network are stable

### 3. **Connection Validation**
- Monitors Playit output for success/error indicators
- 30-second timeout for tunnel establishment
- Detects connection errors in real-time

### 4. **Better Error Handling**
- Verifies playit.toml exists before starting
- Provides actionable troubleshooting steps
- Kills hung processes on timeout

## Additional Troubleshooting

### For Cloud Servers:

1. **Check Firewall Rules**
   ```powershell
   # Allow Playit agent
   New-NetFirewallRule -DisplayName "Playit Agent" -Direction Outbound -Action Allow -Program "path\to\playit.exe"
   ```

2. **Verify Internet Connectivity**
   ```powershell
   Test-NetConnection -ComputerName api.playit.gg -Port 443
   ```

3. **Check SSL/TLS**
   ```powershell
   # Ensure TLS 1.2 is enabled
   [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
   ```

4. **Test Playit Manually**
   ```bash
   cd instances\srv_xxxxx
   .\playit.exe
   ```

### For Users:

If tunnel still fails after 3 attempts:
1. **Re-import Playit Config**: Stop server → Settings → Setup Public Access → Import Config
2. **Check Secret Key**: Make sure the secret key in playit.toml is still valid at https://playit.gg/
3. **Try Local Mode**: Server works locally; public access can be configured later
4. **Contact Support**: Provide full error logs from the Console tab

## Testing
After rebuilding:
```bash
go build
```

Deploy a server from cloud and monitor logs for:
- ✅ "Playit config deployed. Starting tunnel in 3 seconds..."
- 🔄 Retry attempts (if needed)
- ✅ "Playit tunnel established successfully!"
- 🌐 Public address displayed

## Changes Made
- [backend/playit.go](backend/playit.go): Added retry logic, connection validation, error detection
- [backend/app.go](backend/app.go): Added startup delay before tunnel initialization
