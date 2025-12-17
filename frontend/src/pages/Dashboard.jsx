import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// 1. Backend Functions
import { GetMyServers, CreateServer, JoinServer, StartServer, StopServer, AuthorizeDrive, InstallServer } from '../../wailsjs/go/backend/App';
// 2. Runtime Functions
import { EventsOn } from '../../wailsjs/runtime/runtime';
// 3. Components
import SettingsModal from '../components/SettingsModal';

export default function Dashboard() {
    const [servers, setServers] = useState([]);
    const [newServerName, setNewServerName] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [rcloneConf, setRcloneConf] = useState("");
    const [isAuthorizing, setIsAuthorizing] = useState(false);

    const [needsSetup, setNeedsSetup] = useState(false);
    const [activeServerId, setActiveServerId] = useState(null);
    const [isInstalling, setIsInstalling] = useState(false);

    // Settings State
    const [settingsServerId, setSettingsServerId] = useState(null);

    // Logging State
    const [logs, setLogs] = useState([]);
    const [activePort, setActivePort] = useState(null);
    const logsEndRef = useRef(null);

    const currentUser = sessionStorage.getItem("mc_username") || "Unknown";
    const navigate = useNavigate();

    useEffect(() => { loadServers() }, []);

    // Live Log Listener
    useEffect(() => {
        const stopListening = EventsOn("server-log", (message) => {
            setLogs((prev) => [...prev, message].slice(-200));
        });
        return () => stopListening && stopListening();
    }, []);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const loadServers = async () => {
        const list = await GetMyServers(currentUser);
        setServers(list || []);
    };

    const handleAuthorize = async () => {
        setIsAuthorizing(true);
        const configResult = await AuthorizeDrive("", "");
        if (configResult.startsWith("Error")) {
            alert(configResult);
        } else {
            setRcloneConf(configResult);
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

    const handleJoin = async () => {
        if (!inviteCode) return;
        const result = await JoinServer(inviteCode, currentUser);
        alert(result);
        setInviteCode("");
        loadServers();
    };

    const handleStart = async (serverId) => {
        setLogs([]);
        setActivePort(null);

        const result = await StartServer(serverId, currentUser);

        if (result.startsWith("Success:")) {
            const port = result.split(":")[1];
            setActivePort(port);
            loadServers();
        } else if (result.includes("directory not found")) {
            setActiveServerId(serverId);
            setNeedsSetup(true);
        } else {
            alert(result);
        }
    };

    const handleStop = async (serverId) => {
        const result = await StopServer(serverId, currentUser);
        if (result.startsWith("Error")) {
            alert(result);
        } else {
            setActivePort(null);
            loadServers();
        }
    };

    const handleInstall = async () => {
        setIsInstalling(true);
        const installRes = await InstallServer(activeServerId);
        if (installRes.startsWith("Error")) {
            alert(installRes);
            setIsInstalling(false);
            return;
        }
        await StopServer(activeServerId, currentUser);
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
                <div style={styles.box}>
                    <h3>Create New</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                        <input style={styles.input} placeholder="Server Name" value={newServerName} onChange={(e) => setNewServerName(e.target.value)} />
                        {!rcloneConf ? (
                            <button className="btn" onClick={handleAuthorize} disabled={isAuthorizing} style={{ background: isAuthorizing ? "#555" : "#fab005", color: "black" }}>
                                {isAuthorizing ? "Check Browser..." : "🔗 Connect Google Drive"}
                            </button>
                        ) : (
                            <div style={{ color: "#51cf66", textAlign: "center", border: "1px solid", padding: "8px" }}>✅ Drive Connected!</div>
                        )}
                        <button className="btn" onClick={handleCreate} disabled={!rcloneConf} style={{ opacity: rcloneConf ? 1 : 0.5 }}>Create Server</button>
                    </div>
                </div>

                <div style={styles.box}>
                    <h3>Join Existing</h3>
                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                        <input style={styles.input} placeholder="Enter Invite Code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
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
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <div>
                                    <h3 style={{ margin: "0 0 5px 0" }}>{server.name}</h3>
                                    <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "10px" }}>ID: {server.invite_code}</div>
                                </div>

                                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                    {/* Status Badge */}
                                    <div style={{ padding: "4px 8px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold", background: isRunning ? "rgba(81, 207, 102, 0.2)" : "rgba(255, 255, 255, 0.1)", color: isRunning ? "#51cf66" : "#888" }}>
                                        {isRunning ? "ONLINE" : "OFFLINE"}
                                    </div>

                                    {/* Gear Icon (MOVED INSIDE THE LOOP) */}
                                    {isMyServer && (
                                        <button
                                            onClick={() => setSettingsServerId(server.id)}
                                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}
                                            title="Server Settings"
                                        >
                                            ⚙️
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #444" }}>
                                {!isRunning && <button className="btn" onClick={() => handleStart(server.id)} style={{ width: "100%", background: "#228be6" }}>Start Server</button>}
                                {isRunning && isMyServer && <button className="btn" onClick={() => handleStop(server.id)} style={{ width: "100%", background: "#fa5252" }}>Stop Server</button>}
                                {isRunning && !isMyServer && <div style={{ textAlign: "center", color: "#ff6b6b" }}>🔒 Locked by <b>{server.lock.hosted_by}</b></div>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* SETTINGS MODAL (Outside the loop, but conditionally rendered) */}
            {settingsServerId && (
                <SettingsModal
                    serverId={settingsServerId}
                    onClose={() => setSettingsServerId(null)}
                />
            )}

            {/* MODAL */}
            {needsSetup && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <div style={{ background: "#2a2a2a", padding: "2rem", borderRadius: "10px", textAlign: "center", maxWidth: "400px" }}>
                        <h2>🆕 New Server Detected</h2>
                        <p>This server is empty. Install Minecraft?</p>
                        <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
                            <button className="btn" onClick={() => setNeedsSetup(false)} style={{ background: "#444" }}>Cancel</button>
                            <button className="btn" onClick={handleInstall} disabled={isInstalling} style={{ background: "#fab005", color: "black" }}>{isInstalling ? "Downloading..." : "⬇️ Install & Fix"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SERVER ADDRESS BAR --- */}
            {activePort && (
                <div style={{ background: "#2ecc71", padding: "15px", marginTop: "20px", borderRadius: "8px", color: "black", fontWeight: "bold", textAlign: "center" }}>
                    🚀 Server Running at: <span style={{ fontSize: "1.2rem", background: "white", padding: "2px 8px", borderRadius: "4px", marginLeft: "10px" }}>localhost:{activePort}</span>
                </div>
            )}

            {/* --- LIVE TERMINAL --- */}
            <div style={{ marginTop: "20px", background: "#1e1e1e", borderRadius: "8px", padding: "10px", height: "200px", overflowY: "auto", fontFamily: "monospace", fontSize: "0.8rem", border: "1px solid #444", boxShadow: "inset 0 0 10px #000" }}>
                <div style={{ color: "#888", marginBottom: "5px" }}>_ TERMINAL OUTPUT</div>
                {logs.map((log, index) => (
                    <div key={index} style={{ color: log.includes("Error") ? "#ff6b6b" : "#dfe6e9", whiteSpace: "pre-wrap" }}>
                        {log.startsWith("[MC]") ? <span style={{ color: "#fab005" }}>{log}</span> : log}
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
        </div>
    );
}

const styles = {
    box: { background: "#2a2a2a", padding: "1.5rem", borderRadius: "10px", flex: 1 },
    card: { background: "#333", padding: "1.5rem", borderRadius: "10px", border: "1px solid #444" },
    input: { padding: "10px", borderRadius: "4px", border: "none", flex: 1, background: "#1a1a1a", color: "white" }
};