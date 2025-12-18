import React, { useState, useEffect } from 'react';
import { GetPlayerLists, ManagePlayer } from '../../wailsjs/go/backend/App';
import PlayerDetail from './PlayerDetail';

export default function PlayerModal({ server, onClose }) {
    const [lists, setLists] = useState({ ops: [], whitelist: [], banned: [], history: [] });
    const [activeTab, setActiveTab] = useState("HISTORY");
    const [inputName, setInputName] = useState("");
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [selectedPlayer, setSelectedPlayer] = useState(null);

    const isRunning = server.lock.is_running;

    // Load lists on open and after actions
    useEffect(() => {
        loadData();
    }, [refreshTrigger]);

    const loadData = async () => {
        const data = await GetPlayerLists(server.id);
        setLists(data);
    };

    // --- ACTIONS ---
    const handleAction = async (action, targetName, extra = "") => {
        if (!targetName) return;
        if (!isRunning) {
            alert("⚠️ Server must be ONLINE to manage players.");
            return;
        }

        // Now calling ManagePlayer with 4 arguments
        const res = await ManagePlayer(server.id, action, targetName, extra);
        if (res === "Success") {
            // Wait a sec for server to update JSON files, then refresh UI
            setTimeout(() => setRefreshTrigger(prev => prev + 1), 1000);
            setInputName("");
            if(action.includes("ban") || action.includes("kick")) setSelectedPlayer(null); // Close detail if banned
        } else {
            alert(res);
        }
    };

    // Helper to check if a player is in a specific list
    const isInList = (listKey, name) => {
        return lists[listKey]?.some(p => p.name.toLowerCase() === name.toLowerCase());
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>

                {/* CONDITIONAL RENDERING: Detail View OR List View */}
                {selectedPlayer ? (
                    <PlayerDetail
                        player={selectedPlayer}
                        knownPlayers={lists.history || []}
                        onBack={() => {
                            setSelectedPlayer(null);
                            setRefreshTrigger(prev => prev + 1); // Refresh lists when coming back
                        }}
                        onAction={handleAction}
                    />
                ) : (
                    <>
                        {/* HEADER */}
                        <div style={styles.header}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.5rem' }}>👤</span>
                                <div>
                                    <h2 style={{ margin: 0, color: '#fff' }}>Player Manager</h2>
                                    <div style={styles.subTitle}>Manage Whitelist, OPs, and Bans</div>
                                </div>
                            </div>
                            <button onClick={onClose} style={styles.closeBtn}>×</button>
                        </div>

                        {/* TABS */}
                        <div style={styles.tabs}>
                            <TabButton label="All Players" active={activeTab === "HISTORY"} onClick={() => setActiveTab("HISTORY")} />
                            <TabButton label="Whitelist" active={activeTab === "WHITELIST"} onClick={() => setActiveTab("WHITELIST")} />
                            <TabButton label="Operators (OP)" active={activeTab === "OPS"} onClick={() => setActiveTab("OPS")} />
                            <TabButton label="Banned" active={activeTab === "BANNED"} onClick={() => setActiveTab("BANNED")} />
                        </div>

                        {/* ADD PLAYER INPUT (Only for management tabs) */}
                        {activeTab !== "HISTORY" && (
                            <div style={styles.actionBar}>
                                <input
                                    style={styles.input}
                                    placeholder={`Add player to ${activeTab.toLowerCase()}...`}
                                    value={inputName}
                                    onChange={(e) => setInputName(e.target.value)}
                                />
                                <button
                                    style={styles.addBtn}
                                    onClick={() => {
                                        const actionMap = { "WHITELIST": "whitelist_add", "OPS": "op", "BANNED": "ban" };
                                        handleAction(actionMap[activeTab], inputName);
                                    }}
                                    disabled={!isRunning}
                                >
                                    + Add
                                </button>
                            </div>
                        )}

                        {/* LIST CONTENT */}
                        <div style={styles.content}>
                            {getListForTab(activeTab, lists).length === 0 && (
                                <div style={styles.emptyState}>No players found in this list.</div>
                            )}

                            {getListForTab(activeTab, lists).map((p, i) => (
                                <div key={i} style={styles.playerCard}>
                                    <div
                                        style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', flex: 1 }}
                                        onClick={() => setSelectedPlayer(p)}
                                    >
                                        <img
                                            src={`https://crafatar.com/avatars/${p.uuid || p.name}?size=32&overlay`}
                                            alt="head"
                                            style={styles.head}
                                            onError={(e) => e.target.src = "https://crafatar.com/avatars/Steve?size=32"}
                                        />
                                        <div>
                                            <div style={styles.playerName}>{p.name || "Unknown"}</div>
                                            <div style={styles.uuid}>{p.uuid}</div>
                                        </div>
                                    </div>

                                    {/* ACTION BUTTONS */}
                                    <div style={styles.actions}>
                                        {activeTab === "HISTORY" && (
                                            <>
                                                {/* OP TOGGLE */}
                                                <button
                                                    style={isInList("ops", p.name) ? styles.tagOpActive : styles.tagOp}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAction(isInList("ops", p.name) ? "deop" : "op", p.name);
                                                    }}
                                                    title={isInList("ops", p.name) ? "Remove OP" : "Make Operator"}
                                                >
                                                    OP
                                                </button>

                                                {/* BAN BUTTON */}
                                                <button
                                                    style={styles.btnIcon}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAction("ban", p.name);
                                                    }}
                                                    title="Ban Player"
                                                >
                                                    🔨
                                                </button>
                                            </>
                                        )}

                                        {activeTab === "WHITELIST" && (
                                            <button
                                                style={styles.btnRemove}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAction("whitelist_remove", p.name);
                                                }}
                                            >
                                                Remove
                                            </button>
                                        )}
                                        {activeTab === "OPS" && (
                                            <button
                                                style={styles.btnRemove}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAction("deop", p.name);
                                                }}
                                            >
                                                Demote
                                            </button>
                                        )}
                                        {activeTab === "BANNED" && (
                                            <button
                                                style={styles.btnRemove}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAction("unban", p.name);
                                                }}
                                            >
                                                Pardon
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Helpers
function getListForTab(tab, lists) {
    switch (tab) {
        case "HISTORY": return lists.history || [];
        case "WHITELIST": return lists.whitelist || [];
        case "OPS": return lists.ops || [];
        case "BANNED": return lists.banned || [];
        default: return [];
    }
}

function TabButton({ label, active, onClick }) {
    return (
        <button onClick={onClick} style={active ? styles.tabActive : styles.tab}>
            {label}
        </button>
    );
}

const styles = {
    overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000 },
    modal: { background: "#18181b", width: "600px", height: "650px", borderRadius: "16px", border: "1px solid #27272a", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" },

    header: { padding: "20px", borderBottom: "1px solid #27272a", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#202023" },
    subTitle: { fontSize: "0.8rem", color: "#888" },
    closeBtn: { background: "none", border: "none", color: "#71717a", fontSize: "1.8rem", cursor: "pointer" },

    tabs: { display: "flex", borderBottom: "1px solid #27272a", background: "#18181b" },
    tab: { flex: 1, padding: "14px", background: "transparent", border: "none", color: "#71717a", cursor: "pointer", fontWeight: "600", borderBottom: "2px solid transparent" },
    tabActive: { flex: 1, padding: "14px", background: "#27272a", border: "none", color: "#fff", cursor: "pointer", fontWeight: "bold", borderBottom: "2px solid #3b82f6" },

    actionBar: { padding: "15px", display: "flex", gap: "10px", borderBottom: "1px solid #27272a" },
    input: { flex: 1, padding: "10px", borderRadius: "8px", background: "#27272a", border: "1px solid #3f3f46", color: "white" },
    addBtn: { padding: "10px 20px", borderRadius: "8px", background: "#3b82f6", color: "white", border: "none", fontWeight: "bold", cursor: "pointer" },

    content: { padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "10px" },
    emptyState: { textAlign: "center", color: "#555", marginTop: "50px", fontStyle: "italic" },

    playerCard: { background: "#27272a", padding: "10px 15px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #3f3f46" },
    head: { borderRadius: "6px" },
    playerName: { color: "white", fontWeight: "bold", fontSize: "0.95rem" },
    uuid: { color: "#71717a", fontSize: "0.7rem", fontFamily: "monospace" },

    actions: { display: "flex", gap: "8px" },
    btnRemove: { background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold" },
    btnIcon: { background: "#3f3f46", color: "#fff", border: "none", width: "32px", height: "32px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },

    tagOp: { background: "#3f3f46", color: "#aaa", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.75rem" },
    tagOpActive: { background: "rgba(16, 185, 129, 0.2)", color: "#10b981", border: "1px solid #10b981", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.75rem" },
};