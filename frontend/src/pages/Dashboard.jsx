import { useState, useEffect, useRef } from 'react';
// Minimal circular refresh icon (Material style)
const RefreshIcon = ({ spinning, color = '#888' }) => (
    <svg
        width="20" height="20" viewBox="0 0 20 20"
        style={{
            display: 'block',
            transition: 'transform 0.5s',
            transform: spinning ? 'rotate(360deg)' : 'none',
        }}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M4 4v4h4" />
        <path d="M2.05 11a8 8 0 1 0 2-7.75L4 8" />
    </svg>
);
import { useNavigate } from 'react-router-dom';
// Backend
import { GetMyServers, CreateServer, JoinServer, StartServer, StopServer, AuthorizeDrive, InstallServer, DeleteServer, GetVersions, LaunchPlayitExternally, ImportPlayitConfig, ForceSyncUp, CheckDependencies, InstallDependencies } from '../../wailsjs/go/backend/App';
import { EventsOn } from '../../wailsjs/runtime/runtime';
// Components
import SettingsModal from '../components/SettingsModal';
import WorldModal from '../components/WorldModal';
import PlayerModal from '../components/PlayerModal';
import AdminModal from '../components/AdminModal';
import Terminal from '../components/Terminal';
import ServerCard from '../components/ServerCard'; // <--- IMPORT THE NEW COMPONENT

export default function Dashboard() {
    // Dependency Check State
    const [isSystemReady, setIsSystemReady] = useState(false);
    const [systemStatus, setSystemStatus] = useState("Checking system integrity...");
    const [systemLogs, setSystemLogs] = useState([]);

    const [servers, setServers] = useState([]);
    const [refreshCooldown, setRefreshCooldown] = useState(false);
    const refreshTimeoutRef = useRef(null);
    // Cleanup cooldown timer on unmount
    useEffect(() => {
        return () => {
            if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
        };
    }, []);

    const handleRefresh = () => {
        if (refreshCooldown) return;
        loadServers();
        setRefreshCooldown(true);
        refreshTimeoutRef.current = setTimeout(() => setRefreshCooldown(false), 2000);
    };

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

    // Wizard State
    const [createStep, setCreateStep] = useState(1);
    const [createdServerId, setCreatedServerId] = useState(null);

    // Modal State
    const [needsSetup, setNeedsSetup] = useState(false);
    const [setupServerId, setSetupServerId] = useState(null);
    const [isInstalling, setIsInstalling] = useState(false);
    const [settingsServerId, setSettingsServerId] = useState(null);
    const [worldSettingsId, setWorldSettingsId] = useState(null);
    const [playerId, setPlayerId] = useState(null);
    const [adminModalId, setAdminModalId] = useState(null);

    const currentUser = sessionStorage.getItem("mc_username") || "Unknown";
    const navigate = useNavigate();

    // Listen to system logs from backend
    useEffect(() => {
        const unsubscribe = EventsOn("server-log", (msg) => {
            setSystemLogs(prev => [...prev, msg]);
        });
        return () => unsubscribe && unsubscribe();
    }, []);

    // Check dependencies on mount
    useEffect(() => {
        verifySystem();
    }, []);

    const verifySystem = async () => {
        try {
            setSystemStatus("Checking system integrity...");
            const ready = await CheckDependencies();
            
            if (ready) {
                setIsSystemReady(true);
                loadServers();
            } else {
                setSystemStatus("Missing critical tools. Downloading...");
                await InstallDependencies();
                setIsSystemReady(true);
                loadServers();
            }
        } catch (error) {
            setSystemStatus(`Error: ${error}. Check internet connection.`);
        }
    };

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
        // Map owner_id to owner and _id to id for compatibility everywhere
        const mappedList = (list || []).map(server => ({
            ...server,
            owner: server.owner_id || server.owner,
            id: server.id || server._id,   // <-- ensure both are set
            _id: server._id || server.id   // <-- ensure both are set
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
        const res = await CreateServer(newServerName, selectedType, selectedVersion, currentUser, rcloneConf);
        
        if (res.startsWith("Error")) {
            alert(res);
            return;
        }
        
        // Reset wizard
        setNewServerName("");
        setRcloneConf("");
        setCreateStep(1);
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
            const server = servers.find(s => s._id === serverId);
            console.log("Server found for setup:", server); // Debug
            console.log("Server type:", server?.type, "Server version:", server?.version); // Debug
            const versionText = server ? `${server.type || 'Minecraft'} ${server.version || 'Server'}` : "Minecraft Server";
            console.log("Version text:", versionText); // Debug
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

    // Loading Screen - Show while checking dependencies
    if (!isSystemReady) {
        return (
            <div style={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)",
                color: "#e0e0e0",
                fontFamily: "'Inter', sans-serif"
            }}>
                <div style={{
                    animation: "spin 2s linear infinite",
                    fontSize: "4rem",
                    marginBottom: "2rem"
                }}>⚙️</div>
                <h2 style={{
                    fontSize: "1.8rem",
                    fontWeight: "bold",
                    marginBottom: "0.5rem",
                    color: "#fab005"
                }}>Setting up Local Cloud</h2>
                <p style={{
                    fontSize: "1rem",
                    color: "#888",
                    marginBottom: "2rem"
                }}>{systemStatus}</p>
                
                {/* Log Output Window */}
                {systemLogs.length > 0 && (
                    <div style={{
                        width: "500px",
                        maxHeight: "300px",
                        background: "#0a0a0a",
                        border: "1px solid #333",
                        borderRadius: "8px",
                        padding: "1rem",
                        overflowY: "auto",
                        fontFamily: "monospace",
                        fontSize: "0.85rem"
                    }}>
                        {systemLogs.map((log, idx) => (
                            <div key={idx} style={{ marginBottom: "4px", color: "#69db7c" }}>
                                {log}
                            </div>
                        ))}
                    </div>
                )}

                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

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
                    <button style={view === "account" ? styles.navBtnActive : styles.navBtn} onClick={() => setView("account")}>
                        👤 Account
                    </button>
                </nav>
                
                <button onClick={() => { sessionStorage.clear(); navigate("/"); }} style={styles.logoutBtn}>
                    Logout
                </button>
            </div>

            {/* MAIN CONTENT AREA */}
            <div style={styles.content}>

                {/* DYNAMIC VIEWS */}
                {view === "dashboard" && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', justifyContent: 'space-between' }}>
                            <h1 style={{ ...styles.pageTitle, marginBottom: 0 }}>My Servers</h1>
                            <button
                                onClick={handleRefresh}
                                disabled={refreshCooldown}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    marginLeft: 10,
                                    cursor: refreshCooldown ? 'not-allowed' : 'pointer',
                                    outline: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    opacity: refreshCooldown ? 0.5 : 1,
                                    transition: 'opacity 0.2s',
                                    height: 22,
                                    width: 22,
                                }}
                                title={refreshCooldown ? 'Please wait before refreshing again' : 'Refresh server list'}
                                onMouseOver={e => e.currentTarget.firstChild.style.stroke = '#fab005'}
                                onMouseOut={e => e.currentTarget.firstChild.style.stroke = '#888'}
                            >
                                <RefreshIcon spinning={refreshCooldown} color="#888" />
                            </button>
                        </div>
                        <div style={styles.grid}>
                            {servers.map(server => (
                                <ServerCard
                                    key={server.id}
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
                                    onPlayers={() => setPlayerId(server.id)}
                                    onAdmins={() => setAdminModalId(server.id)}
                                    onDelete={() => handleDelete(server.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Create View - 3 STEP WIZARD */}
                {view === "create" && (
                    <div style={{ maxWidth: "500px" }}>
                        <h1 style={styles.pageTitle}>Create New Server</h1>
                        
                        {/* STEP INDICATORS */}
                        <div style={{display:'flex', gap:'10px', marginBottom:'20px', fontSize:'0.8rem', alignItems:'center'}}>
                            <span style={{color: createStep>=1 ? '#fab005' : '#444', fontWeight: createStep===1 ? 'bold' : 'normal'}}>1. Details</span>
                            <span style={{color:'#444'}}>→</span>
                            <span style={{color: createStep>=2 ? '#fab005' : '#444', fontWeight: createStep===2 ? 'bold' : 'normal'}}>2. Cloud</span>
                        </div>

                        {/* STEP 1: DETAILS */}
                        {createStep === 1 && (
                            <>
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
                                
                                <button 
                                    onClick={() => setCreateStep(2)} 
                                    disabled={!newServerName || !selectedVersion}
                                    style={styles.primaryBtn}
                                >
                                    Next: Cloud Sync →
                                </button>
                            </>
                        )}

                        {/* STEP 2: CLOUD */}
                        {createStep === 2 && (
                            <>
                                <div style={styles.formGroup}>
                                    <label>Google Drive Connection</label>
                                    <p style={{fontSize:'0.8rem', color:'#888', marginBottom:'15px'}}>
                                        Your world data will be synced to Google Drive for backup and multiplayer sharing.
                                    </p>
                                    {!rcloneConf ? (
                                        <button onClick={handleAuthorize} disabled={isAuthorizing} style={styles.googleBtn}>
                                            {isAuthorizing ? "Waiting..." : "🔗 Link Google Drive"}
                                        </button>
                                    ) : (
                                        <div style={styles.connectedBadge}>✅ Google Drive Connected</div>
                                    )}
                                </div>
                                
                                <div style={{background:'#27272a', padding:'15px', borderRadius:'8px', marginBottom:'20px', fontSize:'0.85rem', lineHeight:'1.5', color:'#aaa'}}>
                                    <div style={{marginBottom:'8px', color:'#fab005', fontWeight:'bold'}}>🌐 Public Access (Optional)</div>
                                    <p style={{margin:0}}>To enable public access for this server, set up your Playit account in <b>Account Settings</b> (sidebar) before hosting.</p>
                                </div>

                                <div style={{display:'flex', gap:'10px'}}>
                                    <button style={styles.secondaryBtn} onClick={() => setCreateStep(1)}>← Back</button>
                                    <button 
                                        style={styles.primaryBtn} 
                                        disabled={!rcloneConf} 
                                        onClick={async () => {
                                            const id = await CreateServer(newServerName, selectedType, selectedVersion, currentUser, rcloneConf);
                                            if (id.startsWith("Error")) {
                                                alert(id);
                                                return;
                                            }
                                            
                                            alert("✅ Server created successfully!");
                                            setNewServerName("");
                                            setRcloneConf("");
                                            setCreateStep(1);
                                            setCreatedServerId(null);
                                            loadServers();
                                            setView("dashboard");
                                        }}
                                    >
                                        ✅ Create Server
                                    </button>
                                </div>
                            </>
                        )}
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

                {/* Account Settings View */}
                {view === "account" && (
                    <div style={{ maxWidth: "600px" }}>
                        <h1 style={styles.pageTitle}>Account Settings</h1>
                        
                        <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                            <h3 style={{ color: '#fab005', marginBottom: '15px' }}>🌐 Public Access (Playit.gg)</h3>
                            <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '20px' }}>
                                Set up your Playit.gg tunnel to allow friends to join your servers from anywhere.
                                This setup is done once and works for all servers you host.
                            </p>
                            
                            <div style={{background:'#27272a', padding:'15px', borderRadius:'8px', marginBottom:'20px', fontSize:'0.9rem', lineHeight:'1.6', color:'#ddd', textAlign:'left'}}>
                                <div style={{marginBottom:'10px', fontWeight:'bold', color:'#fab005'}}>Instructions:</div>
                                <ol style={{paddingLeft:'20px', margin:0, textAlign:'left'}}>
                                    <li style={{marginBottom:'6px'}}>Click <b>"Launch Setup Terminal"</b> below.</li>
                                    <li style={{marginBottom:'6px'}}>Copy the <span style={{color:'#4dabf7', fontFamily:'monospace'}}>https://playit.gg/claim/...</span> link, <b>Claim it</b> in your browser.</li>
                                    <li style={{marginBottom:'6px'}}>Once it says "Agent Online", you can close the terminal.</li>
                                    <li>Click <b>"Save Playit Config"</b> below.</li>
                                </ol>
                            </div>

                            <button 
                                style={{
                                    ...styles.secondaryBtn, 
                                    width:'100%', 
                                    justifyContent:'center',
                                    border:'1px solid #fab005', 
                                    color:'#fab005',
                                    background:'rgba(250, 176, 5, 0.1)',
                                    marginBottom:'15px'
                                }} 
                                onClick={async () => {
                                    const result = await LaunchPlayitExternally("temp");
                                    if (result.startsWith("Error")) {
                                        alert(result);
                                    }
                                }}
                            >
                                🚀 Launch Setup Terminal
                            </button>

                            <button 
                                style={{
                                    ...styles.primaryBtn,
                                    width: '100%',
                                    justifyContent: 'center'
                                }}
                                onClick={async () => {
                                    const res = await ImportPlayitConfig(currentUser);
                                    
                                    if (res === "Success") {
                                        alert("✅ Playit config saved to your account! Your tunnel will work on any server you host.");
                                    } else {
                                        alert(res);
                                    }
                                }}
                            >
                                💾 Save Playit Config
                            </button>
                        </div>

                        <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '12px' }}>
                            <h3 style={{ color: '#fab005', marginBottom: '10px' }}>👤 User Info</h3>
                            <div style={{ color: '#aaa', fontSize: '0.9rem' }}>
                                <div style={{ marginBottom: '8px' }}>
                                    <span style={{ color: '#666' }}>Username:</span> <span style={{ color: '#fff', fontWeight: 'bold' }}>{currentUser}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* FLOATING TERMINAL */}
            <Terminal selectedServer={servers.find(s => s.lock?.is_running) || null} />

            {/* MODALS */}
            {settingsServerId && <SettingsModal serverId={settingsServerId} currentUser={currentUser} onClose={() => setSettingsServerId(null)} />}
            {worldSettingsId && (
                <WorldModal 
                    server={servers.find(s => s.id === worldSettingsId)}
                    currentUser={currentUser}
                    onClose={() => setWorldSettingsId(null)} 
                />
            )}
            {playerId && (
                <PlayerModal 
                    server={servers.find(s => s.id === playerId)}
                    currentUser={currentUser}
                    onClose={() => setPlayerId(null)} 
                />
            )}
            {adminModalId && (
                <AdminModal 
                    server={servers.find(s => s.id === adminModalId)}
                    currentUser={currentUser}
                    onClose={() => setAdminModalId(null)} 
                />
            )}

            {needsSetup && (
                <div style={{ ...styles.modalOverlay }}>
                    <div style={{ ...styles.modalContent, textAlign: "left", paddingLeft: "32px", paddingRight: "32px" }}>
                        <h2 style={{ textAlign: "left" }}>New Server Detected</h2>
                        {(() => {
                            const server = servers.find(s => String(s.id) === String(setupServerId));
                            return (
                                <>
                                    <div style={{ marginBottom: '10px', color: '#4ade80', fontWeight: 600 }}>
                                        {(server?.type || 'Minecraft') + ' ' + (server?.version || '?')}
                                    </div>
                                    <div style={{ marginBottom: '10px', color: '#e0e0e0' }}>
                                        <b>Name:</b> {server?.name || 'Unknown'}<br/>
                                        <b>Owner:</b> {server?.owner || server?.owner_id || '?'}<br/>
                                        <b>Invite Code:</b> {server?.invite_code || '?'}
                                    </div>
                                </>
                            );
                        })()}

                        <p style={{ color: "#ddd", fontSize: "0.9rem", lineHeight: "1.4" }}>
                            This server is not fully set up yet. Please install the necessary files to get started.
                        </p>

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

const styles = {
    container: {
        display: "flex",
        height: "100vh",
        background: "#121212",
        color: "#e0e0e0",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden"
    },
    sidebar: {
        width: "250px",
        background: "#1e1e1e",
        padding: "20px",
        borderRight: "1px solid #333",
        display: "flex",
        flexDirection: "column",
        position: "relative"
    },
    userSection: {
        marginBottom: "20px",
        paddingBottom: "10px",
        borderBottom: "1px solid #333"
    },
    nav: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        marginBottom: "auto"
    },
    navBtn: {
        background: "none",
        border: "none",
        color: "#bbb",
        fontSize: "1rem",
        cursor: "pointer",
        padding: "10px",
        borderRadius: "5px",
        transition: "background 0.3s",
        width: "100%",
        textAlign: "left"
    },
    navBtnActive: {
        background: "#fab005",
        color: "#121212",
        fontSize: "1rem",
        cursor: "pointer",
        padding: "10px",
        borderRadius: "5px",
        width: "100%",
        textAlign: "left",
        fontWeight: "bold"
    },
    logoutBtn: {
        position: "absolute",
        bottom: "20px",
        left: "20px",
        right: "20px",
        background: "#e63946",
        color: "#fff",
        border: "none",
        borderRadius: "5px",
        padding: "10px",
        cursor: "pointer",
        transition: "background 0.3s",
        width: "100%"
    },
    content: {
        flex: 1,
        padding: "20px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column"
    },
    pageTitle: {
        fontSize: "1.8rem",
        fontWeight: "bold",
        marginBottom: "20px",
        color: "#fab005"
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
        gap: "15px"
    },
    formGroup: {
        marginBottom: "15px"
    },
    input: {
        background: "#27272a",
        border: "1px solid #444",
        borderRadius: "5px",
        color: "#e0e0e0",
        padding: "10px",
        fontSize: "1rem",
        width: "100%",
        transition: "border 0.3s",
        outline: "none"
    },
    primaryBtn: {
        background: "#fab005",
        color: "#121212",
        border: "none",
        borderRadius: "5px",
        padding: "10px",
        cursor: "pointer",
        fontSize: "1rem",
        transition: "background 0.3s",
        width: "100%",
        textAlign: "center",
        fontWeight: "bold"
    },
    secondaryBtn: {
        background: "none",
        color: "#fab005",
        border: "1px solid #fab005",
        borderRadius: "5px",
        padding: "10px",
        cursor: "pointer",
        fontSize: "1rem",
        transition: "background 0.3s",
        width: "100%",
        textAlign: "center"
    },
    googleBtn: {
        background: "#4285f4",
        color: "#fff",
        border: "none",
        borderRadius: "5px",
        padding: "10px",
        cursor: "pointer",
        fontSize: "1rem",
        transition: "background 0.3s",
        width: "100%",
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px"
    },
    connectedBadge: {
        background: "#4ade80",
        color: "#121212",
        borderRadius: "5px",
        padding: "10px",
        fontSize: "1rem",
        textAlign: "center",
        fontWeight: "bold",
        width: "100%"
    },
    modalOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
    },
    modalContent: {
        background: "#1e1e1e",
        borderRadius: "8px",
        padding: "20px",
        maxWidth: "500px",
        width: "100%",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
        position: "relative",
        zIndex: 1001
    }
};