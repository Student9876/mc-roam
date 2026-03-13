import { useEffect, useState } from 'react';
import { GetLocalWorldSettings, HasLocalServerFiles, SendConsoleCommand, SaveWorldSetting } from '../../wailsjs/go/backend/App';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// --- CONFIGURATION: MAPS UI TO COMMANDS ---
const RULE_CATEGORIES = {
    GENERAL: [
        { id: "difficulty", label: "Difficulty", type: "select", options: ["peaceful", "easy", "normal", "hard"] },
    ],
    PLAYER: [
        { id: "keepInventory", label: "Keep Inventory", type: "boolean", default: false },
        { id: "naturalRegeneration", label: "Natural Regeneration", type: "boolean", default: true },
        { id: "doImmediateRespawn", label: "Immediate Respawn", type: "boolean", default: false },
        { id: "forgiveDeadPlayers", label: "Forgive Dead Players", type: "boolean", default: true },
        { id: "showDeathMessages", label: "Show Death Messages", type: "boolean", default: true },
        { id: "disableElytraMovementCheck", label: "Disable Elytra Check", type: "boolean", default: false },
        { id: "playersSleepingPercentage", label: "Sleep % Needed", type: "integer", default: 100 },
        { id: "spawnRadius", label: "Spawn Radius", type: "integer", default: 10 },
    ],
    MOBS: [
        { id: "mobGriefing", label: "Mob Griefing", type: "boolean", default: true },
        { id: "doMobSpawning", label: "Mob Spawning", type: "boolean", default: true },
        { id: "doMobLoot", label: "Mob Loot", type: "boolean", default: true },
        { id: "universalAnger", label: "Universal Anger", type: "boolean", default: false },
        { id: "disableRaids", label: "Disable Raids", type: "boolean", default: false },
        { id: "doPatrolSpawning", label: "Patrol Spawning", type: "boolean", default: true },
        { id: "doTraderSpawning", label: "Trader Spawning", type: "boolean", default: true },
        { id: "doInsomnia", label: "Phantoms (Insomnia)", type: "boolean", default: true },
        { id: "maxEntityCramming", label: "Max Entity Cramming", type: "integer", default: 24 },
    ],
    WORLD: [
        { id: "doDaylightCycle", label: "Daylight Cycle", type: "boolean", default: true },
        { id: "doWeatherCycle", label: "Weather Cycle", type: "boolean", default: true },
        { id: "doFireTick", label: "Fire Spread", type: "boolean", default: true },
        { id: "randomTickSpeed", label: "Random Tick Speed", type: "integer", default: 3 },
        { id: "doTileDrops", label: "Block Drops", type: "boolean", default: true },
        { id: "doEntityDrops", label: "Entity Drops", type: "boolean", default: true },
        { id: "commandBlockOutput", label: "Cmd Block Output", type: "boolean", default: true },
        { id: "maxCommandChainLength", label: "Max Cmd Chain", type: "integer", default: 65536 },
    ],
    DAMAGE: [
        { id: "fallDamage", label: "Fall Damage", type: "boolean", default: true },
        { id: "fireDamage", label: "Fire Damage", type: "boolean", default: true },
        { id: "drowningDamage", label: "Drowning Damage", type: "boolean", default: true },
        { id: "freezeDamage", label: "Freeze Damage", type: "boolean", default: true },
        { id: "pvp", label: "PVP (Player vs Player)", type: "boolean", default: true }, // Note: In vanilla this is server.properties, but some forks allow gamerule
    ]
};

export default function WorldModal({ server, currentUser, onClose }) {
    // 1. Load Initial State
    // We merge the server's saved settings with defaults to ensure UI isn't empty
    const savedSettings = server.world_settings || {};
    
    // Flatten categories to get default values for state initialization
    const getInitialState = () => {
        const state = {};
        Object.values(RULE_CATEGORIES).flat().forEach(rule => {
            if (savedSettings[rule.id] !== undefined) {
                const savedValue = savedSettings[rule.id];
                if (rule.type === 'boolean') {
                    state[rule.id] =
                        savedValue === true ||
                        savedValue === 'true' ||
                        savedValue === 1 ||
                        savedValue === '1';
                } else {
                    state[rule.id] = savedValue;
                }
            } else {
                // Set Defaults if not found in DB
                state[rule.id] = rule.type === 'boolean' ? (rule.default || false) : (rule.default || 0);
                if(rule.id === 'difficulty') state[rule.id] = 'easy';
            }
        });
        return state;
    };

    const buildStateFromSettings = (sourceSettings = {}) => {
        const state = {};
        Object.values(RULE_CATEGORIES).flat().forEach(rule => {
            if (sourceSettings[rule.id] !== undefined) {
                const savedValue = sourceSettings[rule.id];
                if (rule.type === 'boolean') {
                    state[rule.id] =
                        savedValue === true ||
                        savedValue === 'true' ||
                        savedValue === 1 ||
                        savedValue === '1';
                } else {
                    state[rule.id] = savedValue;
                }
            } else {
                state[rule.id] = rule.type === 'boolean' ? (rule.default || false) : (rule.default || 0);
                if (rule.id === 'difficulty') state[rule.id] = 'easy';
            }
        });
        return state;
    };

    const [settings, setSettings] = useState(getInitialState());
    const [activeTab, setActiveTab] = useState("PLAYER"); // Default tab
    const [hasLocalFiles, setHasLocalFiles] = useState(true);

    const isSuccess = (result) => typeof result === 'string' && result.toLowerCase().startsWith('success');

    useEffect(() => {
        let ignore = false;

        const hydrateFromLocal = async () => {
            try {
                const localExists = await HasLocalServerFiles(server.id);
                if (ignore) return;
                setHasLocalFiles(localExists);

                if (!localExists) {
                    setSettings(buildStateFromSettings(savedSettings));
                    return;
                }

                const localSettings = await GetLocalWorldSettings(server.id);
                if (ignore) return;
                setSettings(buildStateFromSettings({ ...savedSettings, ...(localSettings || {}) }));
            } catch {
                if (ignore) return;
                setHasLocalFiles(false);
                setSettings(buildStateFromSettings(savedSettings));
            }
        };

        hydrateFromLocal();

        return () => {
            ignore = true;
        };
    }, [currentUser, server.id]);

    // --- HANDLERS ---

    const handleToggle = async (id) => {
        if (!hasLocalFiles) return;
        const prevVal = settings[id];
        const newVal = !prevVal;
        setSettings(prev => ({ ...prev, [id]: newVal })); // Optimistic Update

        try {
            if (id !== 'pvp') {
                const cmdRes = await SendConsoleCommand(server.id, currentUser, `gamerule ${id} ${newVal}`);
                if (!isSuccess(cmdRes)) throw new Error(cmdRes || 'Failed to run gamerule command');
            }

            const saveRes = await SaveWorldSetting(server.id, currentUser, id, newVal);
            if (!isSuccess(saveRes)) throw new Error(saveRes || 'Failed to save world setting');
        } catch (err) {
            setSettings(prev => ({ ...prev, [id]: prevVal }));
            toast.error(err?.message || 'Failed to update setting.');
        }
    };

    const handleSelect = async (id, val) => {
        if (!hasLocalFiles) return;
        const prevVal = settings[id];
        setSettings(prev => ({ ...prev, [id]: val }));

        try {
            if (id === 'difficulty') {
                const cmdRes = await SendConsoleCommand(server.id, currentUser, `difficulty ${val}`);
                if (!isSuccess(cmdRes)) throw new Error(cmdRes || 'Failed to run difficulty command');
            }

            const saveRes = await SaveWorldSetting(server.id, currentUser, id, val);
            if (!isSuccess(saveRes)) throw new Error(saveRes || 'Failed to save world setting');
        } catch (err) {
            setSettings(prev => ({ ...prev, [id]: prevVal }));
            toast.error(err?.message || 'Failed to update setting.');
        }
    };

    const handleIntegerChange = async (id, val) => {
        if (!hasLocalFiles) return;
        const num = parseInt(val);
        if (isNaN(num)) return;
        const prevVal = settings[id];
        setSettings(prev => ({ ...prev, [id]: num }));

        try {
            const cmdRes = await SendConsoleCommand(server.id, currentUser, `gamerule ${id} ${num}`);
            if (!isSuccess(cmdRes)) throw new Error(cmdRes || 'Failed to run gamerule command');

            const saveRes = await SaveWorldSetting(server.id, currentUser, id, num);
            if (!isSuccess(saveRes)) throw new Error(saveRes || 'Failed to save world setting');
        } catch (err) {
            setSettings(prev => ({ ...prev, [id]: prevVal }));
            toast.error(err?.message || 'Failed to update setting.');
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[800px] h-[85vh] max-h-[700px] flex flex-col gap-0 p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b border-border bg-card/50 shrink-0">
                    <DialogTitle>World Settings</DialogTitle>
                    <DialogDescription>Real-time gamerule control center — {server.name}</DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden gap-0">
                    {!hasLocalFiles && (
                        <div className="mx-6 mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                            Local server files were not found for this instance. World settings are read-only until the server files are installed locally.
                        </div>
                    )}

                    <TabsList className="w-full rounded-none border-b border-border bg-background justify-start h-auto p-0 shrink-0">
                        {Object.keys(RULE_CATEGORIES).map(cat => (
                            <TabsTrigger
                                key={cat}
                                value={cat}
                                className="flex-1 rounded-none py-3.5 text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent -mb-px"
                            >
                                {cat}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {Object.keys(RULE_CATEGORIES).map(cat => (
                        <TabsContent key={cat} value={cat} className="flex-1 overflow-hidden mt-0">
                            <div className="h-full overflow-y-auto">
                                <div className="grid grid-cols-2 gap-3 p-6">
                                    {RULE_CATEGORIES[cat].map((rule) => (
                                        <div key={rule.id} className="bg-card px-4 py-3.5 rounded-lg flex justify-between items-center border border-border hover:border-muted-foreground/30 transition-colors">
                                            <div>
                                                <div className="text-sm text-foreground font-medium">{rule.label}</div>
                                                <div className="text-xs text-muted-foreground font-mono mt-0.5">{rule.id}</div>
                                            </div>

                                            {rule.type === 'boolean' && (
                                                <Switch
                                                    checked={settings[rule.id]}
                                                    disabled={!hasLocalFiles}
                                                    onCheckedChange={() => handleToggle(rule.id)}
                                                />
                                            )}

                                            {rule.type === 'integer' && (
                                                <Input
                                                    type="number"
                                                    value={settings[rule.id]}
                                                    disabled={!hasLocalFiles}
                                                    onChange={(e) => setSettings({...settings, [rule.id]: e.target.value})}
                                                    onBlur={(e) => handleIntegerChange(rule.id, e.target.value)}
                                                    className="w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            )}

                                            {rule.type === 'select' && (
                                                <Select value={settings[rule.id]} onValueChange={(v) => handleSelect(rule.id, v)} disabled={!hasLocalFiles}>
                                                    <SelectTrigger className="w-32" disabled={!hasLocalFiles}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {rule.options.map(opt => (
                                                            <SelectItem key={opt} value={opt}>{opt.toUpperCase()}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
