import { useState, useEffect, useRef, useMemo } from 'react';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import { SendConsoleCommand } from '../../wailsjs/go/backend/App';
import './Terminal.css';

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
        <div className="terminal-wrapper" style={{ height: isMinimized ? "35px" : "200px", display: 'flex', flexDirection: 'column' }}>

            {/* HEADER */}
            <div className="terminal-header" style={{ display: 'flex', justifyContent: 'space-between', padding: 0 }}>
                <div style={{ display: 'flex' }}>
                    <TabButton label="System Logs" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
                    <TabButton label="Console" active={activeTab === 'terminal'} onClick={() => setActiveTab('terminal')} />
                </div>
                <div onClick={() => setIsMinimized(!isMinimized)} className="minimize-btn">
                    {isMinimized ? "▲" : "▼"}
                </div>
            </div>

            {/* BODY */}
            {!isMinimized && (
                <>
                    <div className="terminal-body" onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', background: '#111', paddingBottom: '5px' }}>
                        {filteredLogs.map((log) => (
                            <LogLine key={log.id} log={log} />
                        ))}
                        <div ref={endRef} />
                    </div>

                    {/* INPUT (Terminal Only) */}
                    {activeTab === 'terminal' && (
                        <div className="terminal-input-bar">
                            <span style={{ color: '#fab005', fontWeight: 'bold' }}>&gt;</span>
                            <input
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

const TabButton = ({ label, active, onClick }) => (
    <div onClick={onClick} style={{
        padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem',
        color: active ? '#fab005' : '#777',
        borderBottom: active ? '2px solid #fab005' : '2px solid transparent',
        background: active ? '#1a1a1a' : '#0f0f0f'
    }}>
        {label}
    </div>
);

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
        <div style={{
            fontFamily: 'Consolas, monospace', fontSize: '0.85rem', padding: '1px 8px', color: color,
            lineHeight: '1.4', wordBreak: 'break-word', textAlign: 'left'
        }}>
            <span style={{ color: '#555', marginRight: '8px', fontSize: '0.75rem', userSelect: 'none' }}>
                {log.time}
            </span>
            {displayText}
        </div>
    );
};