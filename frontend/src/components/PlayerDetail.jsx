import React, { useState } from 'react';
import './PlayerDetail.css';

export default function PlayerDetail({ player, knownPlayers, onBack, onAction }) {
    const [tpCoords, setTpCoords] = useState({ x: 0, y: 100, z: 0 });
    const [targetPlayer, setTargetPlayer] = useState("");

    // Filter out the current player from the list
    const otherPlayers = knownPlayers.filter(p => p.name !== player.name);

    return (
        <div className="player-detail-container">
            {/* HEADER */}
            <div className="player-detail-header">
                <button onClick={onBack} className="player-detail-back-btn">← Back</button>
                <div className="player-detail-header-info">
                    <img
                        src={`https://crafatar.com/avatars/${player.uuid || player.name}?size=48&overlay`}
                        alt="Skin"
                        className="player-detail-avatar"
                    />
                    <div>
                        <h2 className="player-detail-name">{player.name}</h2>
                        <div className="player-detail-uuid">{player.uuid}</div>
                    </div>
                </div>
            </div>

            <div className="player-detail-grid player-detail-scroll">

                {/* LEFT COL: STATUS */}
                <div className="player-detail-col">

                    {/* GAMEMODE */}
                    <div className="player-detail-panel">
                        <div className="player-detail-panel-title">Gamemode</div>
                        <div className="player-detail-gm-grid">
                            <ModeBtn icon="⚔️" label="Survival" onClick={() => onAction("gamemode_survival", player.name)} />
                            <ModeBtn icon="✨" label="Creative" onClick={() => onAction("gamemode_creative", player.name)} />
                            <ModeBtn icon="🗺️" label="Adventure" onClick={() => onAction("gamemode_adventure", player.name)} />
                            <ModeBtn icon="👻" label="Spectator" onClick={() => onAction("gamemode_spectator", player.name)} />
                        </div>
                    </div>

                    {/* STATUS ACTIONS */}
                    <div className="player-detail-panel">
                        <div className="player-detail-panel-title">Vitals</div>
                        <div className="player-detail-action-grid">
                            <ActionButton label="💀 Kill" color="#ef4444" onClick={() => onAction("kill", player.name)} />
                            <ActionButton label="💖 Heal" color="#10b981" onClick={() => onAction("heal", player.name)} />
                            <ActionButton label="🍖 Starve" color="#f97316" onClick={() => onAction("starve", player.name)} />
                            <ActionButton label="🍗 Feed" color="#10b981" onClick={() => onAction("feed", player.name)} />
                        </div>
                    </div>

                    {/* INVENTORY PLACEHOLDER */}
                    <div className="player-detail-panel">
                        <div className="player-detail-panel-title">Inventory</div>
                        <div className="player-detail-inventory-grid">
                            {Array.from({ length: 27 }).map((_, i) => <div key={i} className="player-detail-slot">?</div>)}
                        </div>
                        <div className="player-detail-inventory-grid-hotbar">
                            {Array.from({ length: 9 }).map((_, i) => <div key={i} className="player-detail-slot">?</div>)}
                        </div>
                    </div>
                </div>

                {/* RIGHT COL: TELEPORT */}
                <div className="player-detail-col">

                    {/* TELEPORTATION PANEL */}
                    <div className="player-detail-panel">
                        <div className="player-detail-panel-title">Teleport</div>

                        {/* 1. To Spawn */}
                        <div className="player-detail-tp-section">
                            <button className="player-detail-tp-btn" onClick={() => onAction("teleport_spawn", player.name)}>
                                🔮 Warp to Spawn (0, 100, 0)
                            </button>
                        </div>

                        {/* 2. To Coordinates */}
                        <div className="player-detail-tp-coords-box">
                            <div className="player-detail-tp-label">To Coordinates</div>
                            <div className="player-detail-coords-input-group">
                                <input type="number" placeholder="X" value={tpCoords.x} onChange={e => setTpCoords({ ...tpCoords, x: e.target.value })} className="player-detail-coord-input" />
                                <input type="number" placeholder="Y" value={tpCoords.y} onChange={e => setTpCoords({ ...tpCoords, y: e.target.value })} className="player-detail-coord-input" />
                                <input type="number" placeholder="Z" value={tpCoords.z} onChange={e => setTpCoords({ ...tpCoords, z: e.target.value })} className="player-detail-coord-input" />
                            </div>
                            <button
                                className="player-detail-mini-btn"
                                onClick={() => onAction("teleport_coords", player.name, `${tpCoords.x} ${tpCoords.y} ${tpCoords.z}`)}
                            >
                                Go →
                            </button>
                        </div>

                        {/* 3. To Another Player */}
                        <div className="player-detail-tp-player-box">
                            <div className="player-detail-tp-label">To Player</div>
                            <div className="player-detail-player-select-group">
                                <select
                                    className="player-detail-select"
                                    value={targetPlayer}
                                    onChange={(e) => setTargetPlayer(e.target.value)}
                                >
                                    <option value="">Select a player...</option>
                                    {otherPlayers.map(p => (
                                        <option key={p.name} value={p.name}>{p.name}</option>
                                    ))}
                                </select>
                                <button
                                    className="player-detail-mini-btn"
                                    disabled={!targetPlayer}
                                    onClick={() => onAction("teleport_to_player", player.name, targetPlayer)}
                                >
                                    Go →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Subcomponents
function ModeBtn({ icon, label, onClick }) {
    return (
        <button className="player-detail-mode-btn" onClick={onClick}>
            <div className="player-detail-mode-icon">{icon}</div>
            <div className="player-detail-mode-label">{label}</div>
        </button>
    )
}

function ActionButton({ label, color, onClick }) {
    return (
        <button
            onClick={onClick}
            className="player-detail-action-btn"
            style={{
                background: `${color}20`,
                color: color,
                border: `1px solid ${color}40`
            }}
        >
            {label}
        </button>
    );
}