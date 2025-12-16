import { useState, useEffect } from 'react';
import { GetMyServers, CreateServer } from '../../wailsjs/go/backend/App';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const [servers, setServers] = useState([]);
    const [newServerName, setNewServerName] = useState("");

    // We assume the user is "admin" for testing. 
    // Later we will store the actual logged-in user in a Context or LocalStorage.
    const currentUser = "admin";
    const navigate = useNavigate();

    // Load servers on startup
    useEffect(() => {
        loadServers();
    }, []);

    const loadServers = async () => {
        const list = await GetMyServers(currentUser);
        setServers(list || []);
    };

    const handleCreate = async () => {
        if (!newServerName) return;
        await CreateServer(newServerName, currentUser);
        setNewServerName("");
        loadServers(); // Refresh list
    };

    return (
        <div style={{ padding: "2rem", color: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <h1>My Servers</h1>
                <button className="btn" onClick={() => navigate("/")}>Logout</button>
            </div>

            {/* Create Server Section */}
            <div style={{ background: "#2a2a2a", padding: "1rem", borderRadius: "8px", marginBottom: "2rem", display: "flex", gap: "10px" }}>
                <input
                    type="text"
                    placeholder="New Server Name"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    style={{ padding: "10px", flex: 1, borderRadius: "4px", border: "none" }}
                />
                <button className="btn" onClick={handleCreate}>Create Server</button>
            </div>

            {/* Server List */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>
                {servers.map((server) => (
                    <div key={server.id} style={{ background: "#333", padding: "1.5rem", borderRadius: "10px", border: server.lock.is_running ? "1px solid #51cf66" : "1px solid #444" }}>
                        <h3>{server.name}</h3>
                        <p style={{ color: "#aaa", fontSize: "0.9rem" }}>Code: {server.invite_code}</p>

                        <div style={{ marginTop: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{
                                height: "10px", width: "10px", borderRadius: "50%",
                                background: server.lock.is_running ? "#51cf66" : "#ff6b6b"
                            }}></span>
                            <span>{server.lock.is_running ? "Online" : "Offline"}</span>
                        </div>
                    </div>
                ))}

                {servers.length === 0 && <p>No servers found. Create one!</p>}
            </div>
        </div>
    );
}