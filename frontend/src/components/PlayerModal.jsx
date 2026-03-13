import React, { useState, useEffect } from 'react';
import { GetPlayerLists, ManagePlayer } from '../../wailsjs/go/backend/App';
import PlayerDetail from './PlayerDetail';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hammer, User } from 'lucide-react';
import { toast } from 'sonner';

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
            toast.warning("Server must be ONLINE to manage players.");
            return;
        }

        const res = await ManagePlayer(server.id, currentUser, action, targetName, extra);
        if (res === "Success") {
            toast.success("Done.");
            // Wait a sec for server to update JSON files, then refresh UI
            setTimeout(() => setRefreshTrigger(prev => prev + 1), 1000);
            setInputName("");
            if (action.includes("ban") || action.includes("kick")) setSelectedPlayer(null);
        } else {
            toast.error(res);
        }
    };

    // Helper to check if a player is in a specific list
    const isInList = (listKey, name) => lists[listKey]?.some(p => p.name.toLowerCase() === name.toLowerCase());

    const getListForTab = (tab) => {
        switch(tab) {
            case "HISTORY": return lists.history || [];
            case "WHITELIST": return lists.whitelist || [];
            case "OPS": return lists.ops || [];
            case "BANNED": return lists.banned || [];
            default: return [];
        }
    };

    const TAB_LABELS = {
        "HISTORY": "All Players",
        "WHITELIST": "Whitelist",
        "OPS": "Operators",
        "BANNED": "Banned",
    };

    const ACTION_MAP = { "WHITELIST": "whitelist_add", "OPS": "op", "BANNED": "ban" };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[600px] h-[85vh] max-h-[650px] flex flex-col p-0 gap-0 overflow-hidden">
                {selectedPlayer ? (
                    <PlayerDetail
                        player={selectedPlayer}
                        knownPlayers={lists.history || []}
                        onBack={() => { setSelectedPlayer(null); setRefreshTrigger(prev => prev + 1); }}
                        onAction={handleAction}
                    />
                ) : (
                    <>
                        <DialogHeader className="px-5 py-4 border-b border-border bg-card/50 shrink-0">
                            <DialogTitle>Player Manager</DialogTitle>
                            <DialogDescription>Manage Whitelist, OPs, and Bans</DialogDescription>
                        </DialogHeader>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden gap-0">
                            <TabsList className="w-full rounded-none border-b border-border bg-card/20 justify-start h-auto p-0 shrink-0">
                                {Object.keys(TAB_LABELS).map(tab => (
                                    <TabsTrigger
                                        key={tab}
                                        value={tab}
                                        className="flex-1 rounded-none py-3.5 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent -mb-px"
                                    >
                                        {TAB_LABELS[tab]}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {activeTab !== "HISTORY" && (
                                <div className="px-4 py-3 flex gap-2 border-b border-border shrink-0">
                                    <Input
                                        placeholder={`Add player to ${TAB_LABELS[activeTab].toLowerCase()}...`}
                                        value={inputName}
                                        onChange={(e) => setInputName(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={() => handleAction(ACTION_MAP[activeTab], inputName)}
                                        disabled={!isRunning || !inputName.trim()}
                                    >
                                        + Add
                                    </Button>
                                </div>
                            )}

                            {Object.keys(TAB_LABELS).map(tab => (
                                <TabsContent key={tab} value={tab} className="flex-1 overflow-hidden mt-0">
                                    <ScrollArea className="h-full">
                                        <div className="px-4 py-4 flex flex-col gap-2">
                                            {getListForTab(tab).length === 0 && (
                                                <div className="text-center text-muted-foreground mt-12 italic text-sm">
                                                    No players found in this list.
                                                </div>
                                            )}
                                            {getListForTab(tab).map((p, i) => (
                                                <div key={i} className="bg-card px-3.5 py-2.5 rounded-xl flex justify-between items-center border border-border hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer" onClick={() => setSelectedPlayer(p)}>
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <Avatar className="w-9 h-9 rounded-lg shrink-0 ring-1 ring-border">
                                                            <AvatarImage src={`https://crafatar.com/avatars/${p.uuid || p.name}?size=36&overlay`} />
                                                            <AvatarFallback className="rounded-lg bg-muted"><User className="size-4 text-muted-foreground" /></AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <div className="text-foreground font-semibold text-sm truncate">{p.name || "Unknown"}</div>
                                                            {tab === "HISTORY" && (
                                                                <div className="flex gap-1 mt-0.5">
                                                                    {isInList("ops", p.name) && <span className="text-[0.6rem] font-bold text-[var(--color-accent-green4)] bg-[var(--color-accent-green4)]/10 px-1.5 py-0.5 rounded">OP</span>}
                                                                    {isInList("whitelist", p.name) && <span className="text-[0.6rem] font-bold text-[var(--color-accent-blue2)] bg-[var(--color-accent-blue2)]/10 px-1.5 py-0.5 rounded">WL</span>}
                                                                    {isInList("banned", p.name) && <span className="text-[0.6rem] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">BANNED</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                                        {tab === "HISTORY" && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant={isInList("ops", p.name) ? "secondary" : "outline"}
                                                                    className={`h-7 px-2.5 text-xs ${isInList("ops", p.name) ? "text-[var(--color-accent-green4)] border-[var(--color-accent-green4)]/30" : ""}`}
                                                                    onClick={() => handleAction(isInList("ops", p.name) ? "deop" : "op", p.name)}
                                                                    title={isInList("ops", p.name) ? "Remove OP" : "Make Operator"}
                                                                >
                                                                    {isInList("ops", p.name) ? "✓ OP" : "OP"}
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                    onClick={() => handleAction("ban", p.name)}
                                                                    title="Ban Player"
                                                                >
                                                                    <Hammer className="size-3.5" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        {tab === "WHITELIST" && (
                                                            <Button size="sm" variant="destructive" className="h-7 px-2.5 text-xs" onClick={() => handleAction("whitelist_remove", p.name)}>
                                                                Remove
                                                            </Button>
                                                        )}
                                                        {tab === "OPS" && (
                                                            <Button size="sm" variant="destructive" className="h-7 px-2.5 text-xs" onClick={() => handleAction("deop", p.name)}>
                                                                Demote
                                                            </Button>
                                                        )}
                                                        {tab === "BANNED" && (
                                                            <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => handleAction("unban", p.name)}>
                                                                Pardon
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
