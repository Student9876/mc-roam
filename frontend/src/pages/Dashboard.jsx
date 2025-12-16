import { useState, useEffect } from 'react';
import { GetMyServers, CreateServer, JoinServer } from '../../wailsjs/go/backend/App'; // Import JoinServer
import { useNavigate } from 'react-router-dom';

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
                {servers.map((server) => (
                    <div key={server.id} style={styles.card}>
                        <h3 style={{ margin: "0 0 10px 0" }}>{server.name}</h3>
                        <div style={{ background: "rgba(0,0,0,0.3)", padding: "5px", borderRadius: "4px", fontSize: "0.85rem", marginBottom: "10px" }}>
                            Invite Code: <span style={{ color: "#61dafb", userSelect: "all" }}>{server.invite_code}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{
                                width: "10px", height: "10px", borderRadius: "50%",
                                background: server.lock.is_running ? "#51cf66" : "#ff6b6b"
                            }}></div>
                            <span style={{ color: "#ccc", fontSize: "0.9rem" }}>
                                {server.lock.is_running ? `Hosted by ${server.lock.hosted_by}` : "Offline"}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const styles = {
    box: { background: "#2a2a2a", padding: "1.5rem", borderRadius: "10px", flex: 1 },
    card: { background: "#333", padding: "1.5rem", borderRadius: "10px", border: "1px solid #444" },
    input: { padding: "10px", borderRadius: "4px", border: "none", flex: 1, background: "#1a1a1a", color: "white" }
};