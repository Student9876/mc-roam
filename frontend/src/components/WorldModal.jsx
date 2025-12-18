import { useState, useEffect } from 'react';
import { SendConsoleCommand, SaveWorldSetting } from '../../wailsjs/go/backend/App';

// --- CONFIGURATION: MAPS UI TO COMMANDS ---
const RULE_CATEGORIES = {
    GENERAL: [
        { id: "difficulty", label: "Difficulty", type: "select", options: ["peaceful", "easy", "normal", "hard"] },
    ],
    PLAYER: [
        { id: "keepInventory", label: "Keep Inventory", type: "boolean" },
        { id: "naturalRegeneration", label: "Natural Regeneration", type: "boolean" },
        { id: "doImmediateRespawn", label: "Immediate Respawn", type: "boolean" },
        { id: "forgiveDeadPlayers", label: "Forgive Dead Players", type: "boolean" },
        { id: "showDeathMessages", label: "Show Death Messages", type: "boolean" },
        { id: "disableElytraMovementCheck", label: "Disable Elytra Check", type: "boolean" },
        { id: "playersSleepingPercentage", label: "Sleep % Needed", type: "integer", default: 100 },
        { id: "spawnRadius", label: "Spawn Radius", type: "integer", default: 10 },
    ],
    MOBS: [
        { id: "mobGriefing", label: "Mob Griefing", type: "boolean" },
        { id: "doMobSpawning", label: "Mob Spawning", type: "boolean" },
        { id: "doMobLoot", label: "Mob Loot", type: "boolean" },
        { id: "universalAnger", label: "Universal Anger", type: "boolean" },
        { id: "disableRaids", label: "Disable Raids", type: "boolean" },
        { id: "doPatrolSpawning", label: "Patrol Spawning", type: "boolean" },
        { id: "doTraderSpawning", label: "Trader Spawning", type: "boolean" },
        { id: "doInsomnia", label: "Phantoms (Insomnia)", type: "boolean" },
        { id: "maxEntityCramming", label: "Max Entity Cramming", type: "integer", default: 24 },
    ],
    WORLD: [
        { id: "doDaylightCycle", label: "Daylight Cycle", type: "boolean" },
        { id: "doWeatherCycle", label: "Weather Cycle", type: "boolean" },
        { id: "doFireTick", label: "Fire Spread", type: "boolean" },
        { id: "randomTickSpeed", label: "Random Tick Speed", type: "integer", default: 3 },
        { id: "doTileDrops", label: "Block Drops", type: "boolean" },
        { id: "doEntityDrops", label: "Entity Drops", type: "boolean" },
        { id: "commandBlockOutput", label: "Cmd Block Output", type: "boolean" },
        { id: "maxCommandChainLength", label: "Max Cmd Chain", type: "integer", default: 65536 },
    ],
    DAMAGE: [
        { id: "fallDamage", label: "Fall Damage", type: "boolean" },
        { id: "fireDamage", label: "Fire Damage", type: "boolean" },
        { id: "drowningDamage", label: "Drowning Damage", type: "boolean" },
        { id: "freezeDamage", label: "Freeze Damage", type: "boolean" },
        { id: "pvp", label: "PVP (Player vs Player)", type: "boolean" }, // Note: In vanilla this is server.properties, but some forks allow gamerule
    ]
};

export default function WorldModal({ server, onClose }) {
    // Add custom scrollbar styles
    useEffect(() => {
        const styleId = 'world-modal-scrollbar';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .world-modal-scroll::-webkit-scrollbar {
                    width: 8px;
                }
                .world-modal-scroll::-webkit-scrollbar-track {
                    background: #18181b;
                    border-radius: 4px;
                }
                .world-modal-scroll::-webkit-scrollbar-thumb {
                    background: #3f3f46;
                    border-radius: 4px;
                }
                .world-modal-scroll::-webkit-scrollbar-thumb:hover {
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

    // 1. Load Initial State
    // We merge the server's saved settings with defaults to ensure UI isn't empty
    const savedSettings = server.world_settings || {};
    
    // Flatten categories to get default values for state initialization
    const getInitialState = () => {
        const state = {};
        Object.values(RULE_CATEGORIES).flat().forEach(rule => {
            if (savedSettings[rule.id] !== undefined) {
                state[rule.id] = savedSettings[rule.id];
            } else {
                // Set Defaults if not found in DB
                state[rule.id] = rule.type === 'boolean' ? (rule.default || false) : (rule.default || 0);
                if(rule.id === 'difficulty') state[rule.id] = 'easy';
                
                // Specific Overrides for common rules usually ON by default
                if(['doDaylightCycle', 'doWeatherCycle', 'doMobSpawning', 'mobGriefing', 'doTileDrops', 'naturalRegeneration', 'pvp'].includes(rule.id)) {
                    if(savedSettings[rule.id] === undefined) state[rule.id] = true;
                }
            }
        });
        return state;
    };

    const [settings, setSettings] = useState(getInitialState());
    const [activeTab, setActiveTab] = useState("PLAYER"); // Default tab

    // --- HANDLERS ---

    const handleToggle = async (id) => {
        const newVal = !settings[id];
        setSettings(prev => ({ ...prev, [id]: newVal })); // Optimistic Update
        
        // Command: /gamerule ruleName true/false
        // Exception: PVP usually requires property change, but we'll try gamerule first or ignore if vanilla
        if (id === 'pvp') {
             // PVP is tricky in real-time on Vanilla. On Paper/Spigot, simply toggling variable isn't enough usually.
             // We will try changing difficulty to peaceful and back to reset aggro if needed, 
             // but strictly speaking 'pvp' is a server.property. 
             // FOR NOW: We just save state. 
             // To support Real-Time PVP, plugins are usually needed.
        } else {
            await SendConsoleCommand(server.id, `gamerule ${id} ${newVal}`);
        }
        
        await SaveWorldSetting(server.id, id, newVal);
    };

    const handleSelect = async (id, val) => {
        setSettings(prev => ({ ...prev, [id]: val }));
        
        if (id === 'difficulty') {
            await SendConsoleCommand(server.id, `difficulty ${val}`);
        }
        await SaveWorldSetting(server.id, id, val);
    };

    const handleIntegerChange = async (id, val) => {
        const num = parseInt(val);
        if (isNaN(num)) return;
        
        setSettings(prev => ({ ...prev, [id]: num }));
        await SendConsoleCommand(server.id, `gamerule ${id} ${num}`);
        await SaveWorldSetting(server.id, id, num);
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                
                {/* HEADER */}
                <div style={styles.header}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <div>
                            <h2 style={{ margin: 0, color: '#fff' }}>World Settings</h2>
                            <div style={{fontSize:'0.8rem', color:'#aaa'}}>Real-time control center</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={styles.closeBtn}>×</button>
                </div>

                {/* TABS */}
                <div style={styles.tabs}>
                    {Object.keys(RULE_CATEGORIES).map(cat => (
                        <button 
                            key={cat}
                            style={activeTab === cat ? styles.tabActive : styles.tab}
                            onClick={() => setActiveTab(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* CONTENT AREA */}
                <div style={styles.content} className="world-modal-scroll">
                    <div style={styles.grid}>
                        {RULE_CATEGORIES[activeTab].map((rule) => (
                            <div key={rule.id} style={styles.card}>
                                <div style={styles.labelGroup}>
                                    <div style={styles.label}>{rule.label}</div>
                                    <div style={styles.code}>{rule.id}</div>
                                </div>

                                {/* RENDER BASED ON TYPE */}
                                
                                {rule.type === 'boolean' && (
                                    <button 
                                        onClick={() => handleToggle(rule.id)}
                                        style={{
                                            ...styles.toggleBtn, 
                                            background: settings[rule.id] ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                            color: settings[rule.id] ? '#10b981' : '#ef4444',
                                            border: settings[rule.id] ? '1px solid #10b981' : '1px solid #ef4444'
                                        }}
                                    >
                                        {settings[rule.id] ? "ON" : "OFF"}
                                    </button>
                                )}

                                {rule.type === 'integer' && (
                                    <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                        <input 
                                            type="number" 
                                            value={settings[rule.id]} 
                                            // Update local state on change, send command on BLUR to avoid spam
                                            onChange={(e) => setSettings({...settings, [rule.id]: e.target.value})} 
                                            onBlur={(e) => handleIntegerChange(rule.id, e.target.value)}
                                            style={styles.numInput}
                                        />
                                    </div>
                                )}

                                {rule.type === 'select' && (
                                    <select 
                                        value={settings[rule.id]} 
                                        onChange={(e) => handleSelect(rule.id, e.target.value)}
                                        style={styles.select}
                                    >
                                        {rule.options.map(opt => (
                                            <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}

const styles = {
    overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000, backdropFilter: "blur(5px)" },
    modal: { background: "#18181b", width: "800px", height: "600px", borderRadius: "16px", border: "1px solid #27272a", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" },
    
    header: { padding: "24px", borderBottom: "1px solid #27272a", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#202023" },
    closeBtn: { background: "none", border: "none", color: "#71717a", fontSize: "2rem", cursor: "pointer", lineHeight: "1" },
    
    tabs: { display: "flex", borderBottom: "1px solid #27272a", background: "#18181b" },
    tab: { flex: 1, padding: "16px", background: "transparent", border: "none", color: "#71717a", cursor: "pointer", fontWeight: "600", borderBottom: "2px solid transparent", transition: "all 0.2s" },
    tabActive: { flex: 1, padding: "16px", background: "#27272a", border: "none", color: "#fab005", cursor: "pointer", fontWeight: "bold", borderBottom: "2px solid #fab005" },

    content: { padding: "30px", overflowY: "auto", flex: 1, background: "#18181b", scrollbarWidth: "thin", scrollbarColor: "#3f3f46 #18181b" },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
    
    card: { background: "#27272a", padding: "16px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #3f3f46" },
    labelGroup: { display: "flex", flexDirection: "column" },
    label: { fontSize: "0.95rem", color: "#e4e4e7", fontWeight: "500" },
    code: { fontSize: "0.75rem", color: "#71717a", fontFamily: "monospace", marginTop: "2px" },

    toggleBtn: { padding: "6px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "0.85rem", width: "80px", transition: "all 0.2s" },
    
    numInput: { background: "#18181b", border: "1px solid #3f3f46", color: "white", padding: "8px", borderRadius: "6px", width: "80px", textAlign: "center", fontWeight: "bold" },
    select: { background: "#18181b", border: "1px solid #3f3f46", color: "white", padding: "8px 12px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }
};
