import React, { useState, useEffect } from 'react';
import { GetPlayerLists, ManagePlayer } from '../../wailsjs/go/backend/App';
import PlayerDetail from './PlayerDetail';
import './PlayerModal.css';

export default function PlayerModal({ server, currentUser, onClose }) {
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

        const res = await ManagePlayer(server.id, currentUser, action, targetName, extra);
        if (res === "Success") {
            // Wait a sec for server to update JSON files, then refresh UI
            setTimeout(() => setRefreshTrigger(prev => prev + 1), 1000);
            setInputName("");
            if (action.includes("ban") || action.includes("kick")) setSelectedPlayer(null);
        } else {
            alert(res);
        }
    };

    // Helper to check if a player is in a specific list
    const isInList = (listKey, name) => {
        return lists[listKey]?.some(p => p.name.toLowerCase() === name.toLowerCase());
    };

    return (
        <div className="player-modal-overlay">
            <div className="player-modal">

                {/* CONDITIONAL RENDERING: Detail View OR List View */}
                {selectedPlayer ? (
                    <PlayerDetail
                        player={selectedPlayer}
                        knownPlayers={lists.history || []}
                        onBack={() => {
                            setSelectedPlayer(null);
                            setRefreshTrigger(prev => prev + 1);
                        }}
                        onAction={handleAction}
                    />
                ) : (
                    <>
                        {/* HEADER */}
                        <div className="player-modal-header">
                            <div className="player-modal-header-content">
                                <div>
                                    <h2 className="player-modal-title">Player Manager</h2>
                                    <div className="player-modal-subtitle">Manage Whitelist, OPs, and Bans</div>
                                </div>
                            </div>
                            <button onClick={onClose} className="player-modal-close-btn">×</button>
                        </div>

                        {/* TABS */}
                        <div className="player-modal-tabs">
                            <TabButton label="All Players" active={activeTab === "HISTORY"} onClick={() => setActiveTab("HISTORY")} />
                            <TabButton label="Whitelist" active={activeTab === "WHITELIST"} onClick={() => setActiveTab("WHITELIST")} />
                            <TabButton label="Operators (OP)" active={activeTab === "OPS"} onClick={() => setActiveTab("OPS")} />
                            <TabButton label="Banned" active={activeTab === "BANNED"} onClick={() => setActiveTab("BANNED")} />
                        </div>

                        {/* ADD PLAYER INPUT (Only for management tabs) */}
                        {activeTab !== "HISTORY" && (
                            <div className="player-modal-action-bar">
                                <input
                                    className="player-modal-input"
                                    placeholder={`Add player to ${activeTab.toLowerCase()}...`}
                                    value={inputName}
                                    onChange={(e) => setInputName(e.target.value)}
                                />
                                <button
                                    className="player-modal-add-btn"
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
                        <div className="player-modal-content">
                            {getListForTab(activeTab, lists).length === 0 && (
                                <div className="player-modal-empty-state">No players found in this list.</div>
                            )}

                            {getListForTab(activeTab, lists).map((p, i) => (
                                <div key={i} className="player-modal-player-card">
                                    <div
                                        className="player-modal-player-info"
                                        onClick={() => setSelectedPlayer(p)}
                                    >
                                        <img
                                            src={`https://crafatar.com/avatars/${p.uuid || p.name}?size=32&overlay`}
                                            alt="head"
                                            className="player-modal-player-head"
                                            onError={(e) => e.target.src = "https://crafatar.com/avatars/Steve?size=32"}
                                        />
                                        <div>
                                            <div className="player-modal-player-name">{p.name || "Unknown"}</div>
                                            <div className="player-modal-player-uuid">{p.uuid}</div>
                                        </div>
                                    </div>

                                    {/* ACTION BUTTONS */}
                                    <div className="player-modal-actions">
                                        {activeTab === "HISTORY" && (
                                            <>
                                                {/* OP TOGGLE */}
                                                <button
                                                    className={isInList("ops", p.name) ? "player-modal-tag-op--active" : "player-modal-tag-op"}
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
                                                    className="player-modal-btn-icon"
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
                                                className="player-modal-btn-remove"
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
                                                className="player-modal-btn-remove"
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
                                                className="player-modal-btn-remove"
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
        <button onClick={onClick} className={active ? "player-modal-tab--active" : "player-modal-tab"}>
            {label}
        </button>
    );
}