import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Backend
import { GetMyServers, CreateServer, JoinServer, StartServer, StopServer, AuthorizeDrive, InstallServer, DeleteServer, GetVersions } from '../../wailsjs/go/backend/App';
import { EventsOn } from '../../wailsjs/runtime/runtime';
// Components
import SettingsModal from '../components/SettingsModal';
import WorldModal from '../components/WorldModal';
import Terminal from '../components/Terminal';
import ServerCard from '../components/ServerCard'; // <--- IMPORT THE NEW COMPONENT

export default function Dashboard() {
    const [servers, setServers] = useState([]);

    // Version selection state
    const [allVersions, setAllVersions] = useState([]); // Raw data from DB
    const [availableTypes, setAvailableTypes] = useState([]);
    const [selectedType, setSelectedType] = useState("");
    const [selectedVersion, setSelectedVersion] = useState("");

    // UI State
    const [view, setView] = useState("dashboard");
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
    const [worldSettingsId, setWorldSettingsId] = useState(null);

    const currentUser = sessionStorage.getItem("mc_username") || "Unknown";
    const navigate = useNavigate();

    useEffect(() => { 
        loadServers();
    }, []);

    // Use a separate effect for versions to isolate errors
    useEffect(() => {
        loadVersions();
    }, []);

    // Listen for public address events
    useEffect(() => {
        const stop = EventsOn("public-address", (addr) => setPublicAddress(addr));
        return () => stop && stop();
    }, []);

    const loadServers = async () => {
        const list = await GetMyServers(currentUser);
        // Map owner_id to owner for compatibility with ServerCard
        const mappedList = (list || []).map(server => ({
            ...server,
            owner: server.owner_id || server.owner // Support both field names
        }));
        setServers(mappedList);
    };

    const loadVersions = async () => {
        try {
            const list = await GetVersions();
            
            // 🛑 SAFETY CHECK: If list is null/undefined, stop here to prevent crash
            if (!list || list.length === 0) {
                console.warn("No versions found in DB.");
                return;
            }

            setAllVersions(list);

            // Extract unique types safely
            const types = [...new Set(list.map(v => v.type))];
            setAvailableTypes(types);

            // Select defaults
            if (types.length > 0) {
                const firstType = types[0];
                setSelectedType(firstType);
                
                const vForType = list.filter(v => v.type === firstType);
                if (vForType.length > 0) setSelectedVersion(vForType[0].version);
            }
        } catch (err) {
            console.error("Critical Error loading versions:", err);
        }
    };

    const handleTypeChange = (newType) => {
        setSelectedType(newType);
        const vForType = allVersions.filter(v => v.type === newType);
        if (vForType.length > 0) setSelectedVersion(vForType[0].version);
        else setSelectedVersion("");
    };

    // --- ACTIONS ---
    const handleAuthorize = async () => {
        setIsAuthorizing(true);
        const res = await AuthorizeDrive("", "");
        res.startsWith("Error") ? alert(res) : setRcloneConf(res);
        setIsAuthorizing(false);
    };

    const handleCreate = async () => {
        if (!newServerName || !rcloneConf || !selectedVersion) return;
        await CreateServer(newServerName, selectedType, selectedVersion, currentUser, rcloneConf);
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

    const handleDelete = async (serverId) => {
        if (!confirm("⚠️ ARE YOU SURE?\n\nThis will permanently delete the server, the world, and the cloud backup.\nThis cannot be undone.")) {
            return;
        }

        const res = await DeleteServer(serverId, currentUser);
        if (res === "Success") {
            loadServers(); // Refresh list immediately
        } else {
            alert(res);
        }
    };

    return (
        <div style={styles.container}>
            {/* SIDEBAR */}
            <div style={styles.sidebar}>
                <h2 style={{ marginBottom: "1rem", color: "#fab005", fontSize: "1.3rem" }}>MC Roam</h2>

                {/* User Info at Top */}
                <div style={styles.userSection}>
                    <div style={{ fontSize: "0.7rem", color: "#666", marginBottom: "2px" }}>Logged in as</div>
                    <div style={{ fontWeight: "bold", fontSize: "0.85rem", marginBottom: "0", wordBreak: "break-word", color: "#fab005" }}>{currentUser}</div>
                </div>

                <nav style={styles.nav}>
                    <button style={view === "dashboard" ? styles.navBtnActive : styles.navBtn} onClick={() => setView("dashboard")}>
                        📂 Servers
                    </button>
                    <button style={view === "create" ? styles.navBtnActive : styles.navBtn} onClick={() => setView("create")}>
                        ➕ Create
                    </button>
                    <button style={view === "join" ? styles.navBtnActive : styles.navBtn} onClick={() => setView("join")}>
                        🔗 Join
                    </button>
                    <button onClick={() => { sessionStorage.clear(); navigate("/"); }} style={styles.logoutBtn}>
                        Logout
                    </button>
                </nav>
            </div>

            {/* MAIN CONTENT AREA */}
            <div style={styles.content}>

                {/* DYNAMIC VIEWS */}
                {view === "dashboard" && (
                    <div>
                        <h1 style={styles.pageTitle}>My Servers</h1>
                        <div style={styles.grid}>
                            {servers.map(server => (
                                // Inside Dashboard.jsx -> servers.map loop
                                <ServerCard
                                    key={server.id}
                                    // Merge the global public address into the server object if this is the running server
                                    server={{
                                        ...server,
                                        public_address: (server.lock.is_running && activePort) ? publicAddress : null,
                                        port: activePort
                                    }}
                                    currentUser={currentUser}
                                    onStart={() => handleStart(server.id)}
                                    onStop={() => handleStop(server.id)}
                                    onSettings={() => setSettingsServerId(server.id)}
                                    onWorld={() => setWorldSettingsId(server.id)}
                                    onDelete={() => handleDelete(server.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Create View */}
                {view === "create" && (
                    <div style={{ maxWidth: "500px" }}>
                        <h1 style={styles.pageTitle}>Create New Server</h1>
                        
                        <div style={styles.formGroup}>
                            <label>Server Name</label>
                            <input style={styles.input} value={newServerName} onChange={e => setNewServerName(e.target.value)} placeholder="e.g. Survival World" />
                        </div>

                        {/* VERSION SELECTION ROW */}
                        <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
                            
                            {/* 1. TYPE SELECTOR */}
                            <div style={{ flex: 1 }}>
                                <label style={{display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "#aaa"}}>Server Type</label>
                                <select 
                                    style={styles.input} 
                                    value={selectedType} 
                                    onChange={(e) => handleTypeChange(e.target.value)}
                                    disabled={availableTypes.length === 0}
                                >
                                    {availableTypes.length === 0 && <option>Loading...</option>}
                                    {availableTypes.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 2. VERSION SELECTOR */}
                            <div style={{ flex: 1 }}>
                                <label style={{display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "#aaa"}}>Game Version</label>
                                <select 
                                    style={styles.input} 
                                    value={selectedVersion} 
                                    onChange={(e) => setSelectedVersion(e.target.value)}
                                    disabled={!selectedType}
                                >
                                    {allVersions
                                        .filter(v => v.type === selectedType)
                                        .map(v => (
                                            <option key={v.id} value={v.version}>{v.version}</option>
                                        ))
                                    }
                                </select>
                            </div>
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

                {/* Join View */}
                {view === "join" && (
                    <div style={{ maxWidth: "500px" }}>
                        <h1 style={styles.pageTitle}>Join Existing Server</h1>
                        <p style={{ color: "#888", marginBottom: "20px" }}>Paste the Invite Code shared by your friend.</p>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <input style={styles.input} value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Enter Invite Code" />
                            <button onClick={handleJoin} style={styles.primaryBtn}>Join</button>
                        </div>
                    </div>
                )}
            </div>

            {/* FLOATING TERMINAL */}
            <Terminal />

            {/* MODALS */}
            {settingsServerId && <SettingsModal serverId={settingsServerId} onClose={() => setSettingsServerId(null)} />}
            {worldSettingsId && (
                <WorldModal 
                    server={servers.find(s => s.id === worldSettingsId)} 
                    onClose={() => setWorldSettingsId(null)} 
                />
            )}

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

// Styles
const styles = {
    container: { display: "flex", height: "100vh", width: "100vw", background: "#121212", color: "#e0e0e0", fontFamily: "'Inter', sans-serif", minWidth: "900px", overflow: "hidden", position: "relative" },
    sidebar: { width: "180px", minWidth: "180px", flexShrink: 0, background: "#1a1a1a", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", borderRight: "1px solid #333", overflow: "hidden" },
    content: { flex: 1, padding: "1.5rem", overflowY: "auto", overflowX: "hidden", paddingBottom: "180px", width: "calc(100vw - 180px)", boxSizing: "border-box" },
    nav: { display: "flex", flexDirection: "column", gap: "8px" },
    navBtn: { background: "transparent", border: "none", color: "#888", padding: "8px", textAlign: "left", cursor: "pointer", fontSize: "0.9rem", borderRadius: "6px" },
    navBtnActive: { background: "#333", border: "none", color: "#fff", padding: "8px", textAlign: "left", cursor: "pointer", fontSize: "0.9rem", borderRadius: "6px", fontWeight: "bold" },
    userSection: { borderBottom: "1px solid #333", paddingBottom: "12px", marginBottom: "12px" },
    logoutBtn: { background: "#c92a2a", color: "white", border: "none", padding: "8px", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", width: "100%", marginTop: "8px" },

    // Components
    pageTitle: { fontSize: "1.5rem", marginBottom: "1.5rem", borderBottom: "1px solid #333", paddingBottom: "10px" },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "1.5rem",
        width: "100%",
        boxSizing: "border-box"
    },

    // Status Bar
    statusBar: { background: "#1e1e1e", border: "1px solid #333", padding: "12px 20px", borderRadius: "8px", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", flexWrap: "wrap", gap: "10px" },
    ipTag: { background: "#2b2b2b", padding: "4px 8px", borderRadius: "4px", fontFamily: "monospace", fontSize: "0.85rem", color: "#69db7c", border: "1px solid #69db7c" },
    ipTagPublic: { background: "#2b2b2b", padding: "4px 8px", borderRadius: "4px", fontFamily: "monospace", fontSize: "0.85rem", color: "#fab005", border: "1px solid #fab005" },
    miniStopBtn: { background: "#fa5252", color: "white", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" },

    // Forms
    primaryBtn: { background: "#fab005", color: "black", border: "none", padding: "10px 20px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" },
    secondaryBtn: { background: "#333", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer" },
    input: { width: "100%", padding: "12px", background: "#2a2a2a", border: "1px solid #444", borderRadius: "6px", color: "white", marginBottom: "15px" },
    formGroup: { marginBottom: "20px" },
    googleBtn: { background: "#fff", color: "#333", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "10px" },
    connectedBadge: { color: "#69db7c", border: "1px solid #69db7c", padding: "10px", borderRadius: "6px", display: "inline-block" },

    // Modal
    modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 },
    modalContent: { background: "#222", padding: "30px", borderRadius: "12px", border: "1px solid #444", maxWidth: "400px", textAlign: "center" }
};