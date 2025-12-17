import { useState, useEffect } from 'react';
import { GetServerOptions, SaveServerOptions } from '../../wailsjs/go/backend/App';

export default function SettingsModal({ serverId, onClose }) {
    const [props, setProps] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const data = await GetServerOptions(serverId);
        setProps(data);
        setIsLoading(false);
    };

    const handleSave = async () => {
        const result = await SaveServerOptions(serverId, props);
        alert(result);
        onClose();
    };

    const handleChange = (key, value) => {
        setProps(prev => ({ ...prev, [key]: value }));
    };

    if (isLoading) return <div style={styles.modalOverlay}>Loading Settings...</div>;

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <div style={styles.header}>
                    <h2>⚙️ Server Properties</h2>
                    <button onClick={onClose} style={styles.closeBtn}>X</button>
                </div>

                <div style={styles.grid}>
                    {/* General Settings */}
                    <div style={styles.section}>
                        <h4>General</h4>
                        <label>Max Players
                            <input type="number" value={props["max-players"]} onChange={(e) => handleChange("max-players", e.target.value)} style={styles.input} />
                        </label>
                        <label>Gamemode
                            <select value={props["gamemode"]} onChange={(e) => handleChange("gamemode", e.target.value)} style={styles.input}>
                                <option value="survival">Survival</option>
                                <option value="creative">Creative</option>
                                <option value="adventure">Adventure</option>
                                <option value="spectator">Spectator</option>
                            </select>
                        </label>
                        <label>Difficulty
                            <select value={props["difficulty"]} onChange={(e) => handleChange("difficulty", e.target.value)} style={styles.input}>
                                <option value="peaceful">Peaceful</option>
                                <option value="easy">Easy</option>
                                <option value="normal">Normal</option>
                                <option value="hard">Hard</option>
                            </select>
                        </label>
                    </div>

                    {/* Toggles */}
                    <div style={styles.section}>
                        <h4>Rules</h4>
                        <Toggle label="Cracked (No Login)" checked={!props["online-mode"]} onChange={(v) => handleChange("online-mode", !v)} />
                        <Toggle label="Whitelist" checked={props["white-list"]} onChange={(v) => handleChange("white-list", v)} />
                        <Toggle label="PVP" checked={props["pvp"]} onChange={(v) => handleChange("pvp", v)} />
                        <Toggle label="Command Blocks" checked={props["enable-command-block"]} onChange={(v) => handleChange("enable-command-block", v)} />
                        <Toggle label="Fly" checked={props["allow-flight"]} onChange={(v) => handleChange("allow-flight", v)} />
                        <Toggle label="Nether" checked={props["allow-nether"]} onChange={(v) => handleChange("allow-nether", v)} />
                    </div>

                    {/* Spawning */}
                    <div style={styles.section}>
                        <h4>Spawning</h4>
                        <Toggle label="Monsters" checked={props["spawn-monsters"]} onChange={(v) => handleChange("spawn-monsters", v)} />
                        <Toggle label="Animals" checked={props["spawn-animals"]} onChange={(v) => handleChange("spawn-animals", v)} />
                        <Toggle label="Villagers" checked={props["spawn-npcs"]} onChange={(v) => handleChange("spawn-npcs", v)} />
                    </div>
                </div>

                <div style={styles.footer}>
                    <button onClick={handleSave} style={styles.saveBtn}>💾 Save Changes</button>
                </div>
            </div>
        </div>
    );
}

// Helper Component for Checkboxes
function Toggle({ label, checked, onChange }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", background: "#333", padding: "8px", borderRadius: "4px" }}>
            <span>{label}</span>
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ transform: "scale(1.5)" }} />
        </div>
    );
}

const styles = {
    modalOverlay: {
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
    },
    modalContent: {
        background: "#222", padding: "20px", borderRadius: "12px", width: "800px", maxHeight: "90vh", overflowY: "auto",
        border: "1px solid #444", color: "white"
    },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
    closeBtn: { background: "transparent", border: "none", color: "#888", fontSize: "1.5rem", cursor: "pointer" },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" },
    section: { background: "#1a1a1a", padding: "15px", borderRadius: "8px" },
    input: { width: "100%", padding: "8px", marginTop: "5px", marginBottom: "10px", background: "#333", color: "white", border: "1px solid #555", borderRadius: "4px" },
    footer: { marginTop: "20px", textAlign: "right" },
    saveBtn: { background: "#fab005", color: "black", padding: "10px 20px", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }
};