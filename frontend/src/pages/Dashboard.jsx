import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GetMyServers, CreateServer, JoinServer, StartServer, StopServer, AuthorizeDrive, InstallServer } from '../../wailsjs/go/backend/App';

export default function Dashboard() {
    const [servers, setServers] = useState([]);
    const [newServerName, setNewServerName] = useState("");
    const [inviteCode, setInviteCode] = useState(""); // New State
    const [rcloneConf, setRcloneConf] = useState("");
    const [isAuthorizing, setIsAuthorizing] = useState(false); // UI Loading state

    const [needsSetup, setNeedsSetup] = useState(false); // Controls the Install Modal
    const [activeServerId, setActiveServerId] = useState(null); // Which server are we trying to start?
    const [isInstalling, setIsInstalling] = useState(false); // Loading spinner for download

    const currentUser = sessionStorage.getItem("mc_username") || "Unknown";
    const navigate = useNavigate();

    useEffect(() => { loadServers() }, []);

    const loadServers = async () => {
        const list = await GetMyServers(currentUser);
        setServers(list || []);
    };

    const handleAuthorize = async () => {
        setIsAuthorizing(true);
        // Pass empty strings to use the hardcoded defaults in Go
        const configResult = await AuthorizeDrive("", "");

        if (configResult.startsWith("Error")) {
            alert(configResult);
        } else {
            setRcloneConf(configResult); // Fill the hidden state
        }
        setIsAuthorizing(false);
    };

    const handleCreate = async () => {
        if (!newServerName) return alert("Enter a name!");
        if (!rcloneConf) return alert("You must connect Google Drive first!");

        await CreateServer(newServerName, currentUser, rcloneConf);
        setNewServerName("");
        setRcloneConf("");
        loadServers();
    };

    // New Function
    const handleJoin = async () => {
        if (!inviteCode) return;
        const result = await JoinServer(inviteCode, currentUser);
        alert(result); // Simple feedback
        setInviteCode("");
        loadServers();
    };

    const handleStart = async (serverId) => {
        // 1. First, check if the cloud has files
        // (This assumes we already injected config. 
        //  Wait... StartServer usually injects config. 
        //  We might need to call StartServer, let it fail, and catch the error?
        //  Actually, let's keep it simple: Let StartServer fail, return a specific error string.)

        const result = await StartServer(serverId, currentUser);

        // CATCH THE "Directory not found" ERROR
        if (result.includes("directory not found") || result.includes("setup required")) {
            // Trigger Setup Mode!
            setActiveServerId(serverId);
            setNeedsSetup(true);
        } else if (result.startsWith("Error")) {
            alert(result);
        } else {
            loadServers();
        }
    };

    const handleStop = async (serverId) => {
        const result = await StopServer(serverId, currentUser);
        if (result.startsWith("Error")) {
            alert(result);
        } else {
            loadServers(); // Refresh to see the offline status
        }
    };

    // New Function: Run the Installer
    const handleInstall = async () => {
        setIsInstalling(true);
        // 1. Install Files
        const installRes = await InstallServer("1.20.4");
        if (installRes.startsWith("Error")) {
            alert(installRes);
            setIsInstalling(false);
            return;
        }

        // 2. Force a "Sync Up" to create the cloud folder
        // We can cheat by calling StopServer (which triggers Sync Up)
        await StopServer(activeServerId, currentUser);

        // 3. Close Modal and Refresh
        setIsInstalling(false);
        setNeedsSetup(false);
        alert("Installation Complete! You can now Start the server.");
    };

    return (
        <div style={{ padding: "2rem", color: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}>
                <h1>Welcome, {currentUser}</h1>
                <button className="btn" onClick={() => {
                    sessionStorage.clear();
                    navigate("/");
                }}>Logout</button>
            </div>

            {/* Action Bar */}
            <div style={{ display: "flex", gap: "20px", marginBottom: "2rem" }}>
                {/* Create Box */}
                <div style={styles.box}>
                    <h3>Create New</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                        <input
                            style={styles.input}
                            placeholder="Server Name"
                            value={newServerName}
                            onChange={(e) => setNewServerName(e.target.value)}
                        />

                        {/* The Wizard UI */}
                        {!rcloneConf ? (
                            <button
                                className="btn"
                                onClick={handleAuthorize}
                                disabled={isAuthorizing}
                                style={{ background: isAuthorizing ? "#555" : "#fab005", color: "black" }}
                            >
                                {isAuthorizing ? "Check your Browser..." : "🔗 Connect Google Drive"}
                            </button>
                        ) : (
                            <div style={{ color: "#51cf66", fontSize: "0.9rem", textAlign: "center", border: "1px solid #51cf66", padding: "8px", borderRadius: "4px" }}>
                                ✅ Drive Connected!
                            </div>
                        )}

                        <button
                            className="btn"
                            onClick={handleCreate}
                            disabled={!rcloneConf} // Disable if not connected
                            style={{ opacity: rcloneConf ? 1 : 0.5 }}
                        >
                            Create Server
                        </button>
                    </div>
                </div>

                {/* Join Box */}
                <div style={styles.box}>
                    <h3>Join Existing</h3>
                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                        <input
                            style={styles.input}
                            placeholder="Enter Invite Code"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                        />
                        <button className="btn" onClick={handleJoin}>Join</button>
                    </div>
                </div>
            </div>

            {/* Server List */}
            <h2>Your Servers</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>
                {servers.map((server) => {
                    const isRunning = server.lock.is_running;
                    const isMyServer = server.lock.hosted_by === currentUser;

                    return (
                        <div key={server.id} style={styles.card}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                <div>
                                    <h3 style={{ margin: "0 0 5px 0" }}>{server.name}</h3>
                                    <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "10px" }}>
                                        ID: {server.invite_code}
                                    </div>
                                </div>
                                {/* Status Badge */}
                                <div style={{
                                    padding: "4px 8px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold",
                                    background: isRunning ? "rgba(81, 207, 102, 0.2)" : "rgba(255, 255, 255, 0.1)",
                                    color: isRunning ? "#51cf66" : "#888"
                                }}>
                                    {isRunning ? "ONLINE" : "OFFLINE"}
                                </div>
                            </div>

                            {/* The Control Center */}
                            <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #444" }}>
                                {!isRunning && (
                                    <button className="btn"
                                        onClick={() => handleStart(server.id)}
                                        style={{ width: "100%", background: "#228be6" }}>
                                        Start Server
                                    </button>
                                )}

                                {isRunning && isMyServer && (
                                    <button className="btn"
                                        onClick={() => handleStop(server.id)}
                                        style={{ width: "100%", background: "#fa5252" }}>
                                        Stop Server
                                    </button>
                                )}

                                {isRunning && !isMyServer && (
                                    <div style={{ textAlign: "center", color: "#ff6b6b", fontSize: "0.9rem" }}>
                                        🔒 Locked by <b>{server.lock.hosted_by}</b>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* INSTALLATION MODAL */}
            {needsSetup && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center"
                }}>
                    <div style={{ background: "#2a2a2a", padding: "2rem", borderRadius: "10px", textAlign: "center", maxWidth: "400px" }}>
                        <h2>🆕 New Server Detected</h2>
                        <p>This server is empty. Would you like to install Minecraft (1.20.4)?</p>

                        <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
                            <button className="btn"
                                onClick={() => setNeedsSetup(false)}
                                style={{ background: "#444" }}>
                                Cancel
                            </button>
                            <button className="btn"
                                onClick={handleInstall}
                                disabled={isInstalling}
                                style={{ background: "#fab005", color: "black" }}>
                                {isInstalling ? "Downloading..." : "⬇️ Install & Fix"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    box: { background: "#2a2a2a", padding: "1.5rem", borderRadius: "10px", flex: 1 },
    card: { background: "#333", padding: "1.5rem", borderRadius: "10px", border: "1px solid #444" },
    input: { padding: "10px", borderRadius: "4px", border: "none", flex: 1, background: "#1a1a1a", color: "white" }
};