import { useState, useEffect } from 'react';
import { GetServerOptions, SaveServerOptions } from '../../wailsjs/go/backend/App';
import './SettingsModal.css';

export default function SettingsModal({ serverId, currentUser, onClose }) {
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
        const result = await SaveServerOptions(serverId, currentUser, props);
        alert(result);
        onClose();
    };

    const handleChange = (key, value) => {
        setProps(prev => ({ ...prev, [key]: value }));
    };

    if (isLoading) return <div style={styles.modalOverlay}>Loading Settings...</div>;

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()} className="settings-modal">
                <div style={styles.header}>
                    <h2 style={styles.title}>⚙️ Server Properties</h2>
                    <button onClick={onClose} style={styles.closeBtn}>✕</button>
                </div>

                <div style={styles.scrollArea} className="settings-scroll">
                    <div style={styles.grid}>
                    {/* General Settings */}
                    <div style={styles.section}>
                        <h4>General</h4>
                        <label style={styles.label}>Max Players</label>
                        <div style={styles.inputWrapper}>
                            <input 
                                type="number" 
                                value={props["max-players"]} 
                                onChange={(e) => handleChange("max-players", e.target.value)} 
                                style={styles.input} 
                            />
                        </div>
                        <label style={styles.label}>Gamemode</label>
                        <div style={styles.inputWrapper}>
                            <select 
                                value={props["gamemode"]} 
                                onChange={(e) => handleChange("gamemode", e.target.value)} 
                                style={styles.input}
                            >
                                <option value="survival">Survival</option>
                                <option value="creative">Creative</option>
                                <option value="adventure">Adventure</option>
                                <option value="spectator">Spectator</option>
                            </select>
                        </div>
                        <label style={styles.label}>Difficulty</label>
                        <div style={styles.inputWrapper}>
                            <select 
                                value={props["difficulty"]} 
                                onChange={(e) => handleChange("difficulty", e.target.value)} 
                                style={styles.input}
                            >
                                <option value="peaceful">Peaceful</option>
                                <option value="easy">Easy</option>
                                <option value="normal">Normal</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
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
                </div>

                <div style={styles.footer}>
                    <button onClick={handleSave} style={styles.saveBtn}>Save Changes</button>
                </div>
            </div>
        </div>
    );
}

// Helper Component for Toggle Switches
function Toggle({ label, checked, onChange }) {
    return (
        <div style={styles.toggleContainer}>
            <span style={styles.toggleLabel}>{label}</span>
            <label style={styles.switch}>
                <input 
                    type="checkbox" 
                    checked={checked} 
                    onChange={(e) => onChange(e.target.checked)}
                    style={{ display: 'none' }}
                />
                <span style={{
                    ...styles.slider,
                    background: checked ? '#4dabf7' : '#555'
                }}></span>
            </label>
        </div>
    );
}

const styles = {
    modalOverlay: {
        position: "fixed", 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        background: "rgba(0,0,0,0.9)",
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center",
        zIndex: 10000,
        backdropFilter: "blur(4px)"
    },
    modalContent: {
        background: "linear-gradient(135deg, #1e1e1e 0%, #252525 100%)",
        padding: "0",
        borderRadius: "16px",
        width: "850px",
        maxWidth: "90vw",
        maxHeight: "85vh",
        border: "1px solid #444",
        color: "white",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
    },
    header: { 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "24px 28px",
        borderBottom: "1px solid #333",
        background: "rgba(26, 26, 26, 0.5)"
    },
    title: {
        margin: 0,
        fontSize: "1.4rem",
        fontWeight: "700",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: "10px"
    },
    closeBtn: { 
        background: "#2a2a2a", 
        border: "1px solid #444", 
        color: "#ccc", 
        fontSize: "1.2rem", 
        cursor: "pointer",
        width: "36px",
        height: "36px",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s"
    },
    scrollArea: {
        overflowY: "auto",
        overflowX: "hidden",
        padding: "24px 28px",
        flex: 1
    },
    grid: { 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr 1fr", 
        gap: "20px"
    },
    section: { 
        background: "rgba(26, 26, 26, 0.6)", 
        padding: "18px", 
        borderRadius: "12px",
        border: "1px solid #333",
        boxSizing: "border-box",
        minWidth: 0
    },
    label: {
        display: "block",
        fontSize: "0.85rem",
        color: "#aaa",
        fontWeight: "500",
        marginBottom: "6px",
        marginTop: "8px"
    },
    inputWrapper: {
        width: "100%",
        boxSizing: "border-box",
        marginBottom: "8px"
    },
    input: { 
        width: "100%",
        boxSizing: "border-box",
        padding: "10px 12px", 
        background: "#2a2a2a", 
        color: "white", 
        border: "1px solid #444", 
        borderRadius: "8px",
        fontSize: "0.9rem",
        transition: "all 0.2s"
    },
    footer: { 
        padding: "20px 28px", 
        textAlign: "right",
        borderTop: "1px solid #333",
        background: "rgba(26, 26, 26, 0.5)"
    },
    saveBtn: { 
        background: "#fab005", 
        color: "black", 
        padding: "12px 28px", 
        border: "none", 
        borderRadius: "8px", 
        fontWeight: "bold", 
        cursor: "pointer",
        fontSize: "1rem",
        transition: "all 0.2s",
        boxShadow: "0 4px 12px rgba(250, 176, 5, 0.3)"
    },
    toggleContainer: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "10px",
        background: "#2a2a2a",
        padding: "10px 14px",
        borderRadius: "8px",
        border: "1px solid #333",
        transition: "all 0.2s"
    },
    toggleLabel: {
        fontSize: "0.9rem",
        color: "#e0e0e0",
        fontWeight: "500"
    },
    switch: {
        position: "relative",
        display: "inline-block",
        width: "48px",
        height: "24px",
        cursor: "pointer"
    },
    slider: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: "24px",
        transition: "0.3s",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)"
    }
};