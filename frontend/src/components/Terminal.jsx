import { useState, useEffect, useRef, useMemo } from 'react';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import { SendConsoleCommand } from '../../wailsjs/go/backend/App';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Terminal({ selectedServer }) {
    const [logs, setLogs] = useState([]);
    const [isMinimized, setIsMinimized] = useState(false);
    const [activeTab, setActiveTab] = useState("logs"); // 'logs' | 'terminal'
    const [commandInput, setCommandInput] = useState("");

    const bufferRef = useRef([]);
    const endRef = useRef(null);
    const isAutoScroll = useRef(true);

    // --- 1. Log Listener (Fixed Timestamps) ---
    useEffect(() => {
        const stop = EventsOn("server-log", (msg) => {
            // CAPTURE TIME NOW (Fixes the "updating time" bug)
            const now = new Date().toLocaleTimeString('en-GB', { hour12: false });

            bufferRef.current.push({
                id: Date.now() + Math.random(),
                text: msg,
                time: now
            });
        });

        // Flush buffer every 50ms
        const interval = setInterval(() => {
            if (bufferRef.current.length > 0) {
                setLogs(prev => {
                    const newLogs = [...prev, ...bufferRef.current];
                    return newLogs.slice(-1000); // Keep last 1000 lines
                });
                bufferRef.current = [];
            }
        }, 50);

        return () => { stop && stop(); clearInterval(interval); };
    }, []);

    // --- 2. Auto-Scroll ---
    useEffect(() => {
        if (!isMinimized && isAutoScroll.current) {
            endRef.current?.scrollIntoView({ behavior: "auto" });
        }
    }, [logs, isMinimized, activeTab]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        isAutoScroll.current = (scrollHeight - scrollTop - clientHeight < 50);
    };

    // --- 3. Send Command ---
    const handleSendCommand = async (e) => {
        if (e.key === 'Enter') {
            if (!commandInput.trim() || !selectedServer) return;

            // Echo command to UI immediately
            const now = new Date().toLocaleTimeString('en-GB', { hour12: false });
            setLogs(prev => [...prev, { id: Date.now(), text: `> ${commandInput}`, time: now }]);

            await SendConsoleCommand(selectedServer.id, commandInput);
            setCommandInput("");
        }
    };

    // --- 4. Smart Filtering ---
    const filteredLogs = useMemo(() => {
        if (activeTab === 'terminal') {
            // Console: Show ONLY Minecraft logs (starts with [MC]:)
            return logs.filter(log => log.text.includes("[MC]:"));
        }
        // System Logs: Show EVERYTHING
        return logs;
    }, [logs, activeTab]);

    return (
        <div
            className="fixed bottom-0 left-0 right-0 bg-[var(--color-bg-surface)] border-t border-[var(--color-border-subtle)] z-[9999] flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-[height] duration-300 ease-in-out"
            style={{ height: isMinimized ? '35px' : '200px' }}
        >
            {/* HEADER */}
            <div className="bg-black h-[35px] flex items-center justify-between select-none border-b border-[var(--color-bg-surface)]">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 gap-0">
                    <TabsList className="h-[35px] bg-transparent rounded-none p-0 gap-0">
                        <TabsTrigger
                            value="logs"
                            className="h-full rounded-none px-4 text-xs data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent text-[#777] hover:text-[#aaa] bg-[#0f0f0f]"
                        >
                            System Logs
                        </TabsTrigger>
                        <TabsTrigger
                            value="terminal"
                            className="h-full rounded-none px-4 text-xs data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent text-[#777] hover:text-[#aaa] bg-[#0f0f0f]"
                        >
                            Console
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                <div
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="px-4 cursor-pointer text-[#ccc] text-xs flex items-center bg-transparent border-none outline-none select-none h-[35px] hover:text-white"
                >
                    {isMinimized ? "▲" : "▼"}
                </div>
            </div>

            {/* BODY */}
            {!isMinimized && (
                <>
                    <div
                        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1.5 bg-[#111] pb-1"
                        onScroll={handleScroll}
                    >
                        {filteredLogs.map((log) => (
                            <LogLine key={log.id} log={log} />
                        ))}
                        <div ref={endRef} />
                    </div>

                    {/* INPUT (Terminal Only) */}
                    {activeTab === 'terminal' && (
                        <div className="border-t border-[var(--color-border-subtle)] px-2 py-2 bg-[var(--color-bg-surface)] flex items-center gap-2">
                            <span className="text-[var(--color-accent-yellow)] font-bold">&gt;</span>
                            <input
                                className="bg-transparent border-none text-white flex-1 font-mono outline-none text-sm disabled:opacity-50"
                                value={commandInput}
                                onChange={(e) => setCommandInput(e.target.value)}
                                onKeyDown={handleSendCommand}
                                placeholder={selectedServer?.lock?.is_running ? "Type /op, /gamemode, etc..." : "Server is offline"}
                                disabled={!selectedServer?.lock?.is_running}
                                autoFocus
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// --- Sub-Components ---

const LogLine = ({ log }) => {
    const t = log.text;
    let color = "#d4d4d4";

    // Color Logic
    if (t.startsWith('>')) color = "#fff";
    else if (t.includes("Error") || t.includes("fail") || t.includes("❌")) color = "#ff6b6b";
    else if (t.includes("Warn")) color = "#fca5a5";
    else if (t.includes("[MC]:")) color = "#f1c40f"; // Gold
    else if (t.includes("[Playit]:")) color = "#4dabf7"; // Blue
    else if (t.includes("[Sync]:")) color = "#a78bfa"; // Purple

    let displayText = t;

    return (
        <div
            className="font-mono text-[0.85rem] px-2 py-px leading-[1.4] break-words text-left"
            style={{ color }}
        >
            <span className="text-[#555] mr-2 text-[0.75rem] select-none">
                {log.time}
            </span>
            {displayText}
        </div>
    );
};