import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Backend
import { GetMyServers, CreateServer, JoinServer, StartServer, StopServer, AuthorizeDrive, InstallServer } from '../../wailsjs/go/backend/App';
import { EventsOn } from '../../wailsjs/runtime/runtime';
// Components
import SettingsModal from '../components/SettingsModal';
import Terminal from '../components/Terminal'; // Import the new Terminal

export default function Dashboard() {
    const [servers, setServers] = useState([]);

    // UI State
    const [view, setView] = useState("dashboard"); // 'dashboard' | 'create' | 'join'
    const [activePort, setActivePort] = useState(null);
    const [publicAddress, setPublicAddress] = useState(null);

    // Form State
    const [newServerName, setNewServerName] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [rcloneConf, setRcloneConf] = useState("");
    const [isAuthorizing, setIsAuthorizing] = useState(false);

    // Modal State
    const [needsSetup, setNeedsSetup] = useState(false);
    const [setupServerId, setSetupServerId] = useState(null);
    const [isInstalling, setIsInstalling] = useState(false);
    const [settingsServerId, setSettingsServerId] = useState(null);

    const currentUser = sessionStorage.getItem("mc_username") || "Unknown";
    const navigate = useNavigate();

    useEffect(() => { loadServers() }, []);

    // Listen for public address events
    useEffect(() => {
        const stop = EventsOn("public-address", (addr) => setPublicAddress(addr));
        return () => stop && stop();
    }, []);

    const loadServers = async () => {
        const list = await GetMyServers(currentUser);
        setServers(list || []);
    };

    // --- ACTIONS ---
    const handleAuthorize = async () => {
        setIsAuthorizing(true);
        const res = await AuthorizeDrive("", "");
        res.startsWith("Error") ? alert(res) : setRcloneConf(res);
        setIsAuthorizing(false);
    };

    const handleCreate = async () => {
        if (!newServerName || !rcloneConf) return;
        await CreateServer(newServerName, currentUser, rcloneConf);
        setNewServerName("");
        setRcloneConf("");
        setView("dashboard");
        loadServers();
    };

    const handleJoin = async () => {
        if (!inviteCode) return;
        const res = await JoinServer(inviteCode, currentUser);
        alert(res);
        setInviteCode("");
        setView("dashboard");
        loadServers();
    };

    const handleStart = async (serverId) => {
        setActivePort(null);
        setPublicAddress(null);
        const res = await StartServer(serverId, currentUser);

        if (res.startsWith("Success:")) {
            setActivePort(res.split(":")[1]);
            loadServers();
        } else if (res.includes("directory not found")) {
            setSetupServerId(serverId);
            setNeedsSetup(true);
        } else {
            alert(res);
        }
    };

    const handleStop = async (serverId) => {
        await StopServer(serverId, currentUser);
        setActivePort(null);
        setPublicAddress(null);
        loadServers();
    };

    const handleInstall = async () => {
        setIsInstalling(true);
        const res = await InstallServer(setupServerId);
        if (res.startsWith("Error")) alert(res);
        else {
            await StopServer(setupServerId, currentUser); // Sync up
            setNeedsSetup(false);
            alert("Installed! You can now start the server.");
        }
        setIsInstalling(false);
    };

    return (
        <div style={styles.container}>
            {/* SIDEBAR */}
            <div style={styles.sidebar}>
                <h2 style={{ marginBottom: "2rem", color: "#fab005" }}>MC Roam</h2>

                <nav style={styles.nav}>
                    <button style={view === "dashboard" ? styles.navBtnActive : styles.navBtn} onClick={() => setView("dashboard")}>
                        📂 My Servers
                    </button>
                    <button style={view === "create" ? styles.navBtnActive : styles.navBtn} onClick={() => setView("create")}>
                        ➕ Create New
                    </button>
                    <button style={view === "join" ? styles.navBtnActive : styles.navBtn} onClick={() => setView("join")}>
                        🔗 Join Server
                    </button>
                </nav>

                <div style={styles.userSection}>
                    <div style={{ fontSize: "0.9rem", color: "#888" }}>Logged in as</div>
                    <div style={{ fontWeight: "bold", marginBottom: "10px" }}>{currentUser}</div>
                    <button onClick={() => { sessionStorage.clear(); navigate("/"); }} style={styles.logoutBtn}>Logout</button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div style={styles.content}>

                {/* STATUS BAR (If Server Running) */}
                {(activePort || publicAddress) && (
                    <div style={styles.statusBar}>
                        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                            <span style={{ fontSize: "1.2rem" }}>🚀 <b>Server Online</b></span>
                            {activePort && <code style={styles.ipTag}>localhost:{activePort}</code>}
                            {publicAddress && <code style={styles.ipTagPublic}>{publicAddress}</code>}
                        </div>
                        <button onClick={() => handleStop(servers.find(s => s.lock.is_running)?.id)} style={styles.miniStopBtn}>Stop Server</button>
                    </div>
                )}

                {/* DYNAMIC VIEWS */}
                {view === "dashboard" && (
                    <div>
                        <h1 style={styles.pageTitle}>My Servers</h1>
                        <div style={styles.grid}>
                            {servers.map(server => (
                                <ServerCard
                                    key={server.id}
                                    server={server}
                                    currentUser={currentUser}
                                    onStart={() => handleStart(server.id)}
                                    onStop={() => handleStop(server.id)}
                                    onSettings={() => setSettingsServerId(server.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {view === "create" && (
                    <div style={{ maxWidth: "500px" }}>
                        <h1 style={styles.pageTitle}>Create New Server</h1>
                        <div style={styles.formGroup}>
                            <label>Server Name</label>
                            <input style={styles.input} value={newServerName} onChange={e => setNewServerName(e.target.value)} placeholder="e.g. Survival World" />
                        </div>

                        <div style={styles.formGroup}>
                            <label>Cloud Storage</label>
                            {!rcloneConf ? (
                                <button onClick={handleAuthorize} disabled={isAuthorizing} style={styles.googleBtn}>
                                    {isAuthorizing ? "Waiting..." : "🔗 Link Google Drive"}
                                </button>
                            ) : (
                                <div style={styles.connectedBadge}>✅ Google Drive Connected</div>
                            )}
                        </div>

                        <button onClick={handleCreate} disabled={!rcloneConf || !newServerName} style={styles.primaryBtn}>
                            Create Server
                        </button>
                    </div>
                )}

                {view === "join" && (
                    <div style={{ maxWidth: "500px" }}>
                        <h1 style={styles.pageTitle}>Join Existing Server</h1>
                        <p style={{ color: "#888", marginBottom: "20px" }}>Paste the Invite Code shared by your friend.</p>
                        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                            <input
                                style={{ ...styles.input, marginBottom: 0 }} // Remove bottom margin for alignment
                                value={inviteCode}
                                onChange={e => setInviteCode(e.target.value)}
                                placeholder="Enter Invite Code"
                            />
                            <button
                                onClick={handleJoin}
                                style={{ ...styles.primaryBtn, height: "46px", whiteSpace: "nowrap" }} // Match input height
                            >
                                Join Server
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* FLOATING TERMINAL */}
            <Terminal />

            {/* MODALS */}
            {settingsServerId && <SettingsModal serverId={settingsServerId} onClose={() => setSettingsServerId(null)} />}

            {needsSetup && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h2>🆕 New Server Detected</h2>
                        <p>Install Minecraft Server (1.20.4)?</p>
                        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                            <button onClick={() => setNeedsSetup(false)} style={styles.secondaryBtn}>Cancel</button>
                            <button onClick={handleInstall} disabled={isInstalling} style={styles.primaryBtn}>
                                {isInstalling ? "Downloading..." : "Install & Fix"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-Component for cleaner code
function ServerCard({ server, currentUser, onStart, onStop, onSettings }) {
    const isRunning = server.lock.is_running;
    const isOwner = server.lock.hosted_by === currentUser;

    return (
        <div style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <h3 style={{ margin: 0 }}>{server.name}</h3>
                    <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "4px" }}>ID: {server.invite_code}</div>
                </div>
                {isOwner && <button onClick={onSettings} style={styles.iconBtn}>⚙️</button>}
            </div>

            <div style={{ margin: "15px 0" }}>
                <span style={{
                    padding: "4px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "bold",
                    background: isRunning ? "rgba(105, 219, 124, 0.15)" : "#2a2a2a",
                    color: isRunning ? "#69db7c" : "#666", border: isRunning ? "1px solid #69db7c" : "1px solid #444"
                }}>
                    {isRunning ? "ONLINE" : "OFFLINE"}
                </span>
            </div>

            {/* Controls */}
            {!isRunning && <button onClick={onStart} style={styles.startBtn}>Start Server</button>}

            {isRunning && isOwner && <button onClick={onStop} style={styles.stopBtn}>Stop Server</button>}

            {isRunning && !isOwner && (
                <div style={{ fontSize: "0.8rem", color: "#fa5252", background: "rgba(250, 82, 82, 0.1)", padding: "8px", borderRadius: "4px" }}>
                    🔒 Hosted by {server.lock.hosted_by}
                </div>
            )}
        </div>
    );
}

// Styles
const styles = {
    container: { display: "flex", height: "100vh", background: "#121212", color: "#e0e0e0", fontFamily: "'Inter', sans-serif" },
    sidebar: { width: "250px", background: "#1a1a1a", padding: "2rem", display: "flex", flexDirection: "column", borderRight: "1px solid #333" },
    content: { flex: 1, padding: "3rem", overflowY: "auto", paddingBottom: "220px" }, // Padding bottom for Terminal space
    nav: { display: "flex", flexDirection: "column", gap: "10px", flex: 1 },
    navBtn: { background: "transparent", border: "none", color: "#888", padding: "10px", textAlign: "left", cursor: "pointer", fontSize: "1rem", borderRadius: "6px" },
    navBtnActive: { background: "#333", border: "none", color: "#fff", padding: "10px", textAlign: "left", cursor: "pointer", fontSize: "1rem", borderRadius: "6px", fontWeight: "bold" },
    userSection: { borderTop: "1px solid #333", paddingTop: "20px" },
    logoutBtn: { background: "#c92a2a", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem" },

    // Dashboard Components
    pageTitle: { fontSize: "1.8rem", marginBottom: "2rem", borderBottom: "1px solid #333", paddingBottom: "10px" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" },
    card: { background: "#1e1e1e", padding: "1.5rem", borderRadius: "12px", border: "1px solid #333", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" },

    // Status Bar
    statusBar: { background: "#1e1e1e", border: "1px solid #333", padding: "15px 25px", borderRadius: "8px", marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
    ipTag: { background: "#2b2b2b", padding: "4px 8px", borderRadius: "4px", fontFamily: "monospace", color: "#69db7c", border: "1px solid #69db7c" },
    ipTagPublic: { background: "#2b2b2b", padding: "4px 8px", borderRadius: "4px", fontFamily: "monospace", color: "#fab005", border: "1px solid #fab005" },
    miniStopBtn: { background: "#fa5252", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" },

    // Buttons & Inputs
    primaryBtn: { background: "#fab005", color: "black", border: "none", padding: "10px 20px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" },
    secondaryBtn: { background: "#333", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer" },
    startBtn: { width: "100%", background: "#228be6", color: "white", border: "none", padding: "10px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" },
    stopBtn: { width: "100%", background: "#fa5252", color: "white", border: "none", padding: "10px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" },
    iconBtn: { background: "transparent", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#888" },
    input: { width: "100%", padding: "12px", background: "#2a2a2a", border: "1px solid #444", borderRadius: "6px", color: "white", marginBottom: "15px" },

    // Create Flow
    formGroup: { marginBottom: "20px" },
    googleBtn: { background: "#fff", color: "#333", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "10px" },
    connectedBadge: { color: "#69db7c", border: "1px solid #69db7c", padding: "10px", borderRadius: "6px", display: "inline-block" },

    // Modal
    modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 },
    modalContent: { background: "#222", padding: "30px", borderRadius: "12px", border: "1px solid #444", maxWidth: "400px", textAlign: "center" }
};