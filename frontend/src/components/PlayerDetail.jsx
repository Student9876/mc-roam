import React, { useState, useEffect } from 'react';

export default function PlayerDetail({ player, knownPlayers, onBack, onAction }) {
    const [tpCoords, setTpCoords] = useState({ x: 0, y: 100, z: 0 });
    const [targetPlayer, setTargetPlayer] = useState("");

    // Filter out the current player from the list
    const otherPlayers = knownPlayers.filter(p => p.name !== player.name);

    // Add custom scrollbar styles
    useEffect(() => {
        const styleId = 'player-detail-scrollbar';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .player-detail-scroll::-webkit-scrollbar {
                    width: 8px;
                }
                .player-detail-scroll::-webkit-scrollbar-track {
                    background: #18181b;
                    border-radius: 4px;
                }
                .player-detail-scroll::-webkit-scrollbar-thumb {
                    background: #3f3f46;
                    border-radius: 4px;
                }
                .player-detail-scroll::-webkit-scrollbar-thumb:hover {
                    background: #52525b;
                }
            `;
            document.head.appendChild(style);
        }
        return () => {
            const styleEl = document.getElementById(styleId);
            if (styleEl) styleEl.remove();
        };
    }, []);

    return (
        <div style={styles.container}>
            {/* HEADER */}
            <div style={styles.header}>
                <button onClick={onBack} style={styles.backBtn}>← Back</button>
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <img 
                        src={`https://crafatar.com/avatars/${player.uuid || player.name}?size=48&overlay`} 
                        alt="Skin" 
                        style={{borderRadius:'8px', border:'2px solid #333'}}
                    />
                    <div>
                        <h2 style={{margin:0, color:'white'}}>{player.name}</h2>
                        <div style={{fontSize:'0.75rem', fontFamily:'monospace', color:'#888'}}>{player.uuid}</div>
                    </div>
                </div>
            </div>

            <div style={styles.grid} className="player-detail-scroll">
                
                {/* LEFT COL: STATUS */}
                <div style={styles.col}>
                    
                    {/* GAMEMODE */}
                    <div style={styles.panel}>
                        <div style={styles.panelTitle}>Gamemode</div>
                        <div style={styles.gmGrid}>
                            <ModeBtn icon="⚔️" label="Survival" onClick={() => onAction("gamemode_survival", player.name)} />
                            <ModeBtn icon="✨" label="Creative" onClick={() => onAction("gamemode_creative", player.name)} />
                            <ModeBtn icon="🗺️" label="Adventure" onClick={() => onAction("gamemode_adventure", player.name)} />
                            <ModeBtn icon="👻" label="Spectator" onClick={() => onAction("gamemode_spectator", player.name)} />
                        </div>
                    </div>

                    {/* STATUS ACTIONS */}
                    <div style={styles.panel}>
                        <div style={styles.panelTitle}>Vitals</div>
                        <div style={styles.actionGrid}>
                            <ActionButton label="💀 Kill" color="#ef4444" onClick={() => onAction("kill", player.name)} />
                            <ActionButton label="💖 Heal" color="#10b981" onClick={() => onAction("heal", player.name)} />
                            <ActionButton label="🍖 Starve" color="#f97316" onClick={() => onAction("starve", player.name)} />
                            <ActionButton label="🍗 Feed" color="#10b981" onClick={() => onAction("feed", player.name)} />
                        </div>
                    </div>

                     {/* INVENTORY PLACEHOLDER */}
                     <div style={styles.panel}>
                        <div style={styles.panelTitle}>Inventory</div>
                        <div style={styles.inventoryGrid}>
                            {Array.from({length: 27}).map((_, i) => <div key={i} style={styles.slot}>?</div>)}
                        </div>
                        <div style={{...styles.inventoryGrid, marginTop:'10px'}}>
                            {Array.from({length: 9}).map((_, i) => <div key={i} style={styles.slot}>?</div>)}
                        </div>
                    </div>
                </div>

                {/* RIGHT COL: TELEPORT */}
                <div style={styles.col}>
                    
                    {/* TELEPORTATION PANEL */}
                    <div style={styles.panel}>
                        <div style={styles.panelTitle}>Teleport</div>
                        
                        {/* 1. To Spawn */}
                        <div style={{marginBottom:'15px'}}>
                            <button style={styles.tpBtn} onClick={() => onAction("teleport_spawn", player.name)}>
                                🔮 Warp to Spawn (0, 100, 0)
                            </button>
                        </div>

                        {/* 2. To Coordinates */}
                        <div style={{marginBottom:'15px', background:'#18181b', padding:'10px', borderRadius:'8px'}}>
                            <div style={{fontSize:'0.8rem', color:'#aaa', marginBottom:'5px'}}>To Coordinates</div>
                            <div style={{display:'flex', gap:'5px', marginBottom:'5px'}}>
                                <input type="number" placeholder="X" value={tpCoords.x} onChange={e => setTpCoords({...tpCoords, x: e.target.value})} style={styles.coordInput} />
                                <input type="number" placeholder="Y" value={tpCoords.y} onChange={e => setTpCoords({...tpCoords, y: e.target.value})} style={styles.coordInput} />
                                <input type="number" placeholder="Z" value={tpCoords.z} onChange={e => setTpCoords({...tpCoords, z: e.target.value})} style={styles.coordInput} />
                            </div>
                            <button 
                                style={styles.miniBtn}
                                onClick={() => onAction("teleport_coords", player.name, `${tpCoords.x} ${tpCoords.y} ${tpCoords.z}`)}
                            >
                                Go →
                            </button>
                        </div>

                        {/* 3. To Another Player */}
                        <div style={{background:'#18181b', padding:'10px', borderRadius:'8px'}}>
                            <div style={{fontSize:'0.8rem', color:'#aaa', marginBottom:'5px'}}>To Player</div>
                            <div style={{display:'flex', gap:'5px'}}>
                                <select 
                                    style={styles.select}
                                    value={targetPlayer}
                                    onChange={(e) => setTargetPlayer(e.target.value)}
                                >
                                    <option value="">Select a player...</option>
                                    {otherPlayers.map(p => (
                                        <option key={p.name} value={p.name}>{p.name}</option>
                                    ))}
                                </select>
                                <button 
                                    style={styles.miniBtn}
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
        <button style={styles.modeBtn} onClick={onClick}>
            <div style={{fontSize:'1.2rem'}}>{icon}</div>
            <div style={{fontSize:'0.7rem'}}>{label}</div>
        </button>
    )
}

function ActionButton({ label, color, onClick }) {
    return (
        <button 
            onClick={onClick}
            style={{
                background: `${color}20`, color: color, border: `1px solid ${color}40`,
                padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left'
            }}
        >
            {label}
        </button>
    );
}

const styles = {
    container: { height: '100%', display: 'flex', flexDirection: 'column' },
    header: { padding: '20px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: '20px', background:'#202023' },
    backBtn: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.9rem' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '20px', overflowY: 'auto' },
    col: { display: 'flex', flexDirection: 'column', gap: '20px' },
    panel: { background: '#27272a', borderRadius: '12px', padding: '15px', border: '1px solid #3f3f46' },
    panelTitle: { color: '#fff', fontWeight: 'bold', marginBottom: '10px', fontSize: '0.9rem', display:'flex', alignItems:'center', gap:'5px', textAlign: 'left' },
    
    gmGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
    modeBtn: { background:'#333', border:'1px solid #444', color:'#ccc', borderRadius:'8px', padding:'10px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'flex-start', textAlign: 'left' },
    
    actionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
    
    inventoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '4px' },
    slot: { aspectRatio: '1/1', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '4px', display:'flex', alignItems:'center', justifyContent:'center', color:'#333', fontSize:'0.7rem' },
    
    tpBtn: { width:'100%', padding:'10px', background:'#3b82f620', color:'#3b82f6', border:'1px solid #3b82f640', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', textAlign: 'left' },
    coordInput: { width: '100%', padding: '6px', borderRadius: '4px', border: 'none', background: '#333', color: 'white', textAlign: 'center' },
    miniBtn: { background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '0 10px', cursor: 'pointer', fontWeight: 'bold' },
    select: { flex: 1, padding: '6px', borderRadius: '4px', border: 'none', background: '#333', color: 'white' }
};
