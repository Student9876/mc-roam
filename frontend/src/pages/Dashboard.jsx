import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GetMyServers, CreateServer, JoinServer, StartServer, StopServer } from '../../wailsjs/go/backend/App';

export default function Dashboard() {
    const [servers, setServers] = useState([]);
    const [newServerName, setNewServerName] = useState("");
    const [inviteCode, setInviteCode] = useState(""); // New State

    const currentUser = sessionStorage.getItem("mc_username") || "Unknown";
    const navigate = useNavigate();

    useEffect(() => { loadServers() }, []);

    const loadServers = async () => {
        const list = await GetMyServers(currentUser);
        setServers(list || []);
    };

    const handleCreate = async () => {
        if (!newServerName) return;
        await CreateServer(newServerName, currentUser);
        setNewServerName("");
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
        const result = await StartServer(serverId, currentUser);
        if (result.startsWith("Error")) {
            alert(result);
        } else {
            loadServers(); // Refresh to see the green light
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
                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                        <input
                            style={styles.input}
                            placeholder="Server Name"
                            value={newServerName}
                            onChange={(e) => setNewServerName(e.target.value)}
                        />
                        <button className="btn" onClick={handleCreate}>Create</button>
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
        </div>
    );
}

const styles = {
    box: { background: "#2a2a2a", padding: "1.5rem", borderRadius: "10px", flex: 1 },
    card: { background: "#333", padding: "1.5rem", borderRadius: "10px", border: "1px solid #444" },
    input: { padding: "10px", borderRadius: "4px", border: "none", flex: 1, background: "#1a1a1a", color: "white" }
};